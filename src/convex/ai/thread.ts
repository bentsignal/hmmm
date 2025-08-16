import type { SyncStreamsReturnValue } from "@convex-dev/agent";
import { vStreamArgs } from "@convex-dev/agent/validators";
import { generateText } from "ai";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { components, internal } from "@/convex/_generated/api";
import {
  ActionCtx,
  internalAction,
  internalMutation,
  mutation,
  MutationCtx,
  query,
  QueryCtx,
} from "@/convex/_generated/server";
import { agent } from "@/convex/ai/agents";
import { isAdmin } from "@/convex/user/user_helpers";
import { modelPresets } from "../ai/models";
import { titleGeneratorPrompt } from "../ai/prompts";
import { MAX_ATTACHMENTS_PER_MESSAGE } from "../library/library_config";
import { messageSendRateLimit } from "../limiter";
import { getUsageHelper } from "../sub/sub_helpers";
import { tryCatch } from "@/lib/utils";
import {
  SystemErrorCode,
  SystemNoticeCode,
} from "@/features/messages/types/message-types";
import {
  formatError,
  formatNotice,
} from "@/features/messages/util/message-util";

/**
 * Gets thread metadata from table separate from agent component. this
 * is where all custom info related to thread state is located
 * @param ctx
 * @param threadId
 * @returns metadata relating to thread
 */
export const getThreadMetadata = async (ctx: QueryCtx, threadId: string) => {
  const metadata = await ctx.db
    .query("threadMetadata")
    .withIndex("by_thread_id", (q) => q.eq("threadId", threadId))
    .first();
  if (!metadata) {
    // metadata not found
    return null;
  }
  return metadata;
};

/**
 * verify that a user is allowed to access a thread. If they are,
 * return the thread metadata. Admin's can access any thread
 * @param ctx
 * @param threadId
 * @returns threadMetadata / null depending on whether or not access is granted
 */
export const authorizeThreadAccess = async (
  ctx: QueryCtx | MutationCtx,
  threadId: string,
) => {
  const userId = await ctx.auth.getUserIdentity();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const [metadata, isAdminUser] = await Promise.all([
    getThreadMetadata(ctx, threadId),
    isAdmin(ctx, userId.subject),
  ]);
  if (!metadata) {
    // thread not found
    return null;
  }
  if (isAdminUser) {
    return metadata;
  }
  if (metadata.userId !== userId.subject) {
    throw new Error("Unauthorized");
  }
  return metadata;
};

/**
 * Log a user facing error to the thread
 * @param ctx
 * @param threadId
 * @param code
 * @param message
 */
export const logSystemError = async (
  ctx: ActionCtx | MutationCtx,
  threadId: string,
  code: SystemErrorCode,
  message: string,
) => {
  console.log(
    "System Error during generation. Error code:",
    code,
    "Error message:",
    message,
  );
  await agent.saveMessage(ctx, {
    threadId: threadId,
    message: {
      role: "assistant",
      content: formatError(code),
    },
  });
};

/**
 * Log a system notice to the thread
 * @param ctx
 * @param threadId
 * @param code
 */
export const logSystemNotice = async (
  ctx: ActionCtx,
  threadId: string,
  code: SystemNoticeCode,
) => {
  await agent.saveMessage(ctx, {
    threadId: threadId,
    message: {
      role: "assistant",
      content: formatNotice(code),
    },
  });
};

export const threadMessageCheck = async (
  ctx: MutationCtx,
  message: string,
  attachmentLength: number,
) => {
  if (message.length > 20000) {
    throw new ConvexError("Message is too long. Please shorten your message.");
  }
  // auth check
  const userId = await ctx.auth.getUserIdentity();
  if (!userId) {
    throw new ConvexError("Unauthorized");
  }
  // check usage and rate limiting
  const [usage] = await Promise.all([
    getUsageHelper(ctx, userId.subject),
    messageSendRateLimit(ctx, userId.subject),
  ]);
  if (usage.limitHit) {
    throw new ConvexError("User has reached usage limit");
  }
  // max 20 files per message
  if (attachmentLength > MAX_ATTACHMENTS_PER_MESSAGE) {
    throw new ConvexError("You can only attach up to 20 files per message.");
  }
  return userId;
};

export const saveNewMessage = async (
  ctx: MutationCtx,
  threadId: string,
  prompt: string,
  attachments?: string[],
) => {
  const fileNames = attachments || [];
  return await agent.saveMessages(ctx, {
    threadId: threadId,
    messages: [
      {
        role: "user",
        content: prompt,
      },
      ...fileNames.map((fileName) => ({
        role: "system" as const,
        content: `User has attached a file with the following file name: ${fileName}`,
      })),
    ],
  });
};

export const generateTitle = internalAction({
  args: {
    prompt: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { prompt, threadId } = args;
    const response = await generateText({
      model: modelPresets.titleGenerator.model,
      prompt: prompt,
      system: titleGeneratorPrompt,
    });
    await ctx.runMutation(internal.ai.thread.updateThreadTitle, {
      threadId: threadId,
      title: response.text.trim(),
    });
  },
});

export const requestNewThread = mutation({
  args: {
    prompt: v.string(),
    // file names
    attachments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { prompt, attachments } = args;
    const numAttachments = attachments?.length || 0;
    // auth, usage, input val, rate limit
    const userId = await threadMessageCheck(ctx, prompt, numAttachments);
    // create new thread in agent component table, as well as
    // new document in separate threadMetadata table
    const { threadId } = await agent.createThread(ctx, {
      userId: userId.subject,
      title: "New Chat",
    });
    // create metadata doc for thread and store first message
    const [{ lastMessageId }] = await Promise.all([
      saveNewMessage(ctx, threadId, prompt, attachments),
      ctx.db.insert("threadMetadata", {
        userId: userId.subject,
        title: "New Chat",
        threadId: threadId,
        updatedAt: Date.now(),
        state: "waiting",
      }),
    ]);
    // generate title for new thread, and start response
    const { error } = await tryCatch(
      Promise.all([
        ctx.scheduler.runAfter(0, internal.ai.thread.generateTitle, {
          threadId: threadId,
          prompt: prompt,
        }),
        ctx.scheduler.runAfter(0, internal.ai.agents.streamResponse, {
          threadId: threadId,
          promptMessageId: lastMessageId,
        }),
      ]),
    );
    if (error) {
      console.error(error);
      logSystemError(
        ctx,
        threadId,
        "G4",
        "Failed to generate title or response",
      );
    }
    return threadId;
  },
});

export const newThreadMessage = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    attachments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { threadId, prompt, attachments } = args;
    const numAttachments = attachments?.length || 0;
    const userId = await threadMessageCheck(ctx, prompt, numAttachments);
    // get thread metadata
    const metadata = await getThreadMetadata(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    if (metadata.userId !== userId.subject) {
      throw new ConvexError("Unauthorized");
    }
    if (metadata.state !== "idle") {
      throw new ConvexError("Thread is not idle");
    }
    // save new message to thread, update thread state, clear previous follow up questions
    const [{ lastMessageId }] = await Promise.all([
      saveNewMessage(ctx, threadId, prompt, attachments),
      ctx.db.patch(metadata._id, {
        state: "waiting",
        updatedAt: Date.now(),
      }),
      ctx.db.patch(metadata._id, {
        followUpQuestions: [],
      }),
    ]);
    // schedule response generation
    const { error } = await tryCatch(
      ctx.scheduler.runAfter(0, internal.ai.agents.streamResponse, {
        threadId: args.threadId,
        promptMessageId: lastMessageId,
      }),
    );
    if (error) {
      console.error(error);
      logSystemError(ctx, threadId, "G4", "Failed to generate response");
    }
  },
});

export const deleteThread = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    // auth check
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    // get thread metadata
    const { threadId } = args;
    const metadata = await getThreadMetadata(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    if (metadata.userId !== userId.subject) {
      throw new Error("Unauthorized");
    }
    if (metadata.state !== "idle") {
      throw new Error("Thread is not idle");
    }
    // delete metadata and thread
    await ctx.db.delete(metadata._id);
    ctx.scheduler.runAfter(
      0,
      components.agent.threads.deleteAllForThreadIdAsync,
      {
        threadId,
      },
    );
  },
});

export const updateThreadTitle = internalMutation({
  args: {
    title: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { title, threadId } = args;
    const metadata = await getThreadMetadata(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    await ctx.db.patch(metadata._id, {
      title: title,
    });
    await agent.updateThreadMetadata(ctx, {
      threadId: threadId,
      patch: {
        title: title,
      },
    });
  },
});

export const updateThreadState = internalMutation({
  args: {
    threadId: v.string(),
    state: v.union(
      v.literal("idle"),
      v.literal("waiting"),
      v.literal("streaming"),
    ),
  },
  handler: async (ctx, args) => {
    const { threadId, state } = args;
    const metadata = await getThreadMetadata(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    await ctx.db.patch(metadata._id, {
      state: state,
    });
  },
});

export const renameThread = mutation({
  args: {
    threadId: v.string(),
    newTitle: v.string(),
  },
  handler: async (ctx, args) => {
    // auth check
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    // get thread metadata
    const { threadId, newTitle } = args;
    const metadata = await getThreadMetadata(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    if (metadata.userId !== userId.subject) {
      throw new Error("Unauthorized");
    }
    // update thread title
    await ctx.db.patch(metadata._id, {
      title: newTitle,
    });
  },
});

export const toggleThreadPin = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    // auth check
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    // get thread metadata
    const { threadId } = args;
    const metadata = await getThreadMetadata(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    if (metadata.userId !== userId.subject) {
      throw new Error("Unauthorized");
    }
    // toggle thread pin
    await ctx.db.patch(metadata._id, {
      pinned: !metadata.pinned,
    });
  },
});

export const saveFollowUpQuestions = internalMutation({
  args: {
    threadId: v.string(),
    followUpQuestions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { threadId, followUpQuestions } = args;
    const metadata = await getThreadMetadata(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    await ctx.db.patch(metadata._id, {
      followUpQuestions: followUpQuestions,
    });
  },
});

export const getThreadTitle = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const metadata = await authorizeThreadAccess(ctx, args.threadId);
    return metadata?.title;
  },
});

export const getThreadState = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { threadId } = args;
    if (threadId.trim().length === 0) {
      return "idle";
    }
    const metadata = await authorizeThreadAccess(ctx, threadId);
    return metadata?.state;
  },
});

export const getThreadList = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.string(),
  },
  handler: async (ctx, args) => {
    // auth check
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const { paginationOpts, search } = args;
    let threads;
    if (search.trim().length > 0) {
      // filter threads by search term
      threads = await ctx.db
        .query("threadMetadata")
        .withSearchIndex("search_title", (q) =>
          q.search("title", search).eq("userId", userId.subject),
        )
        .paginate(paginationOpts);
    } else {
      // get all threads for user
      threads = await ctx.db
        .query("threadMetadata")
        .withIndex("by_user_time", (q) => q.eq("userId", userId.subject))
        .order("desc")
        .paginate(paginationOpts);
    }
    return {
      ...threads,
      page: threads.page.map((thread) => ({
        id: thread.threadId,
        updatedAt: thread.updatedAt,
        title: thread.title,
        state: thread.state,
        pinned: thread.pinned,
      })),
    };
  },
});

export const getThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const { threadId, paginationOpts, streamArgs } = args;
    if (threadId.trim().length === 0) {
      throw new Error("Empty thread ID");
    }
    // auth check is done here
    const metadata = await authorizeThreadAccess(ctx, threadId);
    if (!metadata) {
      const streamsFallback: SyncStreamsReturnValue =
        !streamArgs || streamArgs.kind === "list"
          ? { kind: "list", messages: [] }
          : { kind: "deltas", deltas: [] };
      return {
        continueCursor: "",
        isDone: true,
        page: [],
        pageStatus: null,
        splitCursor: null,
        streams: streamsFallback,
      };
    }
    const [streams, paginated] = await Promise.all([
      agent.syncStreams(ctx, {
        threadId,
        streamArgs,
      }),
      agent.listMessages(ctx, {
        threadId,
        paginationOpts,
      }),
    ]);
    return {
      ...paginated,
      page: paginated.page.map((message) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { userId, model, provider, usage, ...messageWithoutUserId } =
          message;
        return messageWithoutUserId;
      }),
      streams,
    };
  },
});

export const getThreadFollowUpQuestions = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { threadId } = args;
    const metadata = await authorizeThreadAccess(ctx, threadId);
    if (!metadata) {
      return [];
    }
    return metadata.followUpQuestions ?? [];
  },
});
