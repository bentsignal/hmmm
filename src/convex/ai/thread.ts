import type { SyncStreamsReturnValue } from "@convex-dev/agent";
import { vStreamArgs } from "@convex-dev/agent/validators";
import { generateText } from "ai";
import { CustomCtx } from "convex-helpers/server/customFunctions";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { components, internal } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import {
  ActionCtx,
  internalAction,
  internalMutation,
  MutationCtx,
  QueryCtx,
} from "@/convex/_generated/server";
import { agent } from "@/convex/ai/agents";
import { isAdmin } from "@/convex/user/account";
import { modelPresets } from "../ai/models";
import { titleGeneratorPrompt } from "../ai/prompts";
import { getPublicFile } from "../app/library";
import { authedMutation, authedQuery } from "../convex_helpers";
import { messageSendRateLimit } from "../limiter";
import { getPerferredModelIfAllowed, getUserInfoHelper } from "../user/info";
import { getUsageHelper } from "../user/usage";
import { tryCatch } from "@/lib/utils";
import { MAX_ATTACHMENTS_PER_MESSAGE } from "@/features/library/config";
import { LibraryFile } from "@/features/library/types/library-types";
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
export const getMetadata = async (ctx: QueryCtx, threadId: string) => {
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
 * return the thread metadata. Admins can access any thread
 * @param ctx
 * @param threadId
 * @returns threadMetadata / null depending on whether or not access is granted
 */
export const authorizeAccess = async (
  ctx: CustomCtx<typeof authedMutation> | CustomCtx<typeof authedQuery>,
  threadId: string,
) => {
  const [metadata, isAdminUser] = await Promise.all([
    getMetadata(ctx, threadId),
    isAdmin(ctx, ctx.user.subject),
  ]);
  // thread not found
  if (!metadata) {
    return null;
  }
  if (isAdminUser) {
    return metadata;
  }
  if (metadata.userId !== ctx.user.subject) {
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

/**
 * Rate limiting, input validation (message length, attachment length), usage check
 * @param ctx
 * @param message
 * @param attachmentLength
 */
export const validateMessage = async (
  ctx: CustomCtx<typeof authedMutation>,
  message: string,
  attachmentLength: number,
) => {
  // max 20k characters per message
  if (message.length > 20000) {
    throw new ConvexError("Message is too long. Please shorten your message.");
  }
  // max 20 files per message
  if (attachmentLength > MAX_ATTACHMENTS_PER_MESSAGE) {
    throw new ConvexError("You can only attach up to 20 files per message.");
  }
  // check usage and rate limiting
  const [usage] = await Promise.all([
    getUsageHelper(ctx),
    messageSendRateLimit(ctx),
  ]);
  if (usage.limitHit) {
    throw new ConvexError("User has reached usage limit");
  }
};

/**
 * Save user message to thread
 * @param ctx
 * @param threadId
 * @param prompt
 * @param attachmentKeys
 */
export const saveUserMessage = async (
  ctx: CustomCtx<typeof authedMutation>,
  threadId: string,
  prompt: string,
  userInfo: Doc<"personalInfo"> | null,
  attachments?: {
    key: string;
    name: string;
    mimeType: string;
  }[],
) => {
  const parts = [] as Array<{ role: "system"; content: string }>;
  if (
    userInfo &&
    (userInfo.name || userInfo.location || userInfo.language || userInfo.notes)
  ) {
    const fields = [
      userInfo.name ? `The user's name is ${userInfo.name}` : null,
      userInfo.location
        ? `The user's current location is ${userInfo.location}`
        : null,
      userInfo.language
        ? `User would like your response to be in: ${userInfo.language}`
        : null,
      userInfo.notes
        ? `Additional info user would like you to know: ${userInfo.notes}`
        : null,
    ].filter(Boolean) as string[];
    if (fields.length > 0) {
      parts.push({
        role: "system",
        content: `User profile — ${fields.join("; ")}`,
      });
    }
  }
  const { messages } = await agent.saveMessages(ctx, {
    threadId: threadId,
    messages: [
      ...parts,
      {
        role: "user",
        content: prompt,
      },
      ...(attachments?.map((attachment) => ({
        role: "system" as const,
        content: `User has attached a file - file name: <${attachment.name}>, mimeType: <${attachment.mimeType}>, file key: <${attachment.key}>`,
      })) ?? []),
    ],
  });
  if (messages.length === 0) {
    throw new ConvexError("Failed to save message");
  }
  const results = await Promise.all(
    attachments?.map((attachment) =>
      ctx.db
        .query("files")
        .withIndex("by_key", (q) => q.eq("key", attachment.key))
        .first(),
    ) ?? [],
  );
  const files = results.filter((file) => file !== null);
  const lastPromptMessage = messages.find(
    (message) => message.message?.content === prompt,
  );
  if (!lastPromptMessage) {
    throw new ConvexError("Failed to save message");
  }
  await ctx.db.insert("messageMetadata", {
    messageId: lastPromptMessage._id,
    threadId: threadId,
    userId: ctx.user.subject,
    attachments: files.map((file) => file._id),
  });
  return { lastMessageId: messages[messages.length - 1]._id };
};

/**
 * Update title of thread (shown in thread list in sidebar)
 * @param ctx
 * @param threadId
 * @param title
 */
const saveNewTitle = async ({
  ctx,
  threadId,
  title,
}: {
  ctx: MutationCtx | CustomCtx<typeof authedMutation>;
  threadId: string;
  title: string;
}) => {
  const metadata = await getMetadata(ctx, threadId);
  if (!metadata) {
    throw new ConvexError("Thread not found");
  }
  // if function is called by client mutation, check auth
  if ("user" in ctx && metadata.userId !== ctx.user.subject) {
    throw new Error("Unauthorized");
  }
  // update thread title
  await ctx.db.patch(metadata._id, {
    title: title,
  });
  await agent.updateThreadMetadata(ctx, {
    threadId: threadId,
    patch: {
      title: title,
    },
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
    await ctx.runMutation(internal.ai.thread.setTitle, {
      threadId: threadId,
      title: response.text.trim(),
    });
  },
});

export const setTitle = internalMutation({
  args: {
    title: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { title, threadId } = args;
    await saveNewTitle({ ctx, threadId, title });
  },
});

export const rename = authedMutation({
  args: {
    name: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { threadId, name } = args;
    await saveNewTitle({ ctx, threadId, title: name });
  },
});

const vAttachment = v.object({
  key: v.string(),
  name: v.string(),
  mimeType: v.string(),
});

export const create = authedMutation({
  args: {
    prompt: v.string(),
    attachments: v.optional(v.array(vAttachment)),
  },
  handler: async (ctx, args) => {
    const { prompt, attachments } = args;
    const numAttachments = attachments?.length || 0;
    // auth, usage, input val, rate limit
    await validateMessage(ctx, prompt, numAttachments);
    // create new thread in agent component table, as well as
    // new document in separate threadMetadata table
    const { threadId } = await agent.createThread(ctx, {
      userId: ctx.user.subject,
      title: "New Chat",
    });
    const userInfo = await getUserInfoHelper(ctx);
    // create metadata doc for thread and store first message
    const [{ lastMessageId }] = await Promise.all([
      saveUserMessage(ctx, threadId, prompt, userInfo, attachments),
      ctx.db.insert("threadMetadata", {
        userId: ctx.user.subject,
        title: "New Chat",
        threadId: threadId,
        updatedAt: Date.now(),
        state: "waiting",
        pinned: false,
      }),
    ]);
    // determine which model should be used for the response
    const model = await getPerferredModelIfAllowed(ctx, userInfo?.model);
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
          model: model,
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

export const sendMessage = authedMutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    attachments: v.optional(v.array(vAttachment)),
  },
  handler: async (ctx, args) => {
    const { threadId, prompt, attachments } = args;
    const numAttachments = attachments?.length || 0;
    await validateMessage(ctx, prompt, numAttachments);
    // get thread metadata
    const metadata = await authorizeAccess(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    if (metadata.state !== "idle") {
      throw new ConvexError("Thread is not idle");
    }
    const userInfo = await getUserInfoHelper(ctx);
    const model = await getPerferredModelIfAllowed(ctx, userInfo?.model);
    // save new message to thread, update thread state, clear previous follow up questions
    const [{ lastMessageId }] = await Promise.all([
      saveUserMessage(ctx, threadId, prompt, userInfo, attachments),
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
        model: model,
      }),
    );
    if (error) {
      console.error(error);
      logSystemError(ctx, threadId, "G4", "Failed to generate response");
    }
  },
});

export const deleteThread = authedMutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    // get thread metadata
    const { threadId } = args;
    const metadata = await authorizeAccess(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    if (metadata.state !== "idle") {
      throw new Error(
        "Cannot delete a thread while a response is being generated",
      );
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

export const setState = internalMutation({
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
    const metadata = await getMetadata(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    await ctx.db.patch(metadata._id, {
      state: state,
    });
  },
});

export const togglePinned = authedMutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    // get thread metadata
    const { threadId } = args;
    const metadata = await authorizeAccess(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
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
    const metadata = await getMetadata(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    await ctx.db.patch(metadata._id, {
      followUpQuestions: followUpQuestions,
    });
  },
});

export const getTitle = authedQuery({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const metadata = await authorizeAccess(ctx, args.threadId);
    return metadata?.title;
  },
});

export const getState = authedQuery({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { threadId } = args;
    if (threadId.trim().length === 0) {
      return "idle";
    }
    const metadata = await authorizeAccess(ctx, threadId);
    return metadata?.state;
  },
});

export const getThreadList = authedQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.string(),
  },
  handler: async (ctx, args) => {
    const { paginationOpts, search } = args;
    let threads;
    if (search.trim().length > 0) {
      // filter threads by search term
      threads = await ctx.db
        .query("threadMetadata")
        .withSearchIndex("search_title", (q) =>
          q.search("title", search).eq("userId", ctx.user.subject),
        )
        .paginate(paginationOpts);
    } else {
      // get all threads for user
      threads = await ctx.db
        .query("threadMetadata")
        .withIndex("by_user_time", (q) => q.eq("userId", ctx.user.subject))
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

export const getThreadMessages = authedQuery({
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
    const metadata = await authorizeAccess(ctx, threadId);
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
    const dedupedMessageIds = paginated.page
      .filter(
        (message, index, self) =>
          index === self.findIndex((t) => t._id === message._id),
      )
      .map((message) => message._id);

    const messageAttachments = await Promise.all(
      dedupedMessageIds.map(async (messageId) => {
        const messageMetadata = await ctx.db
          .query("messageMetadata")
          .withIndex("by_message_id", (q) => q.eq("messageId", messageId))
          .first();
        if (!messageMetadata || !messageMetadata.attachments) {
          return {
            id: messageId,
            attachments: null,
          };
        }
        const files = await Promise.all(
          messageMetadata.attachments.map((attachment) =>
            ctx.db.get(attachment),
          ),
        );
        const publicFiles = files
          .filter((file) => file?.userId === ctx.user.subject)
          .filter((file) => file !== null)
          .map((file) => getPublicFile(file));
        return {
          id: messageId,
          attachments: publicFiles,
        };
      }),
    );
    const attachmentMap = new Map<string, LibraryFile[]>();
    messageAttachments.forEach((message) => {
      if (message.attachments) {
        attachmentMap.set(message.id, message.attachments);
      }
    });
    return {
      ...paginated,
      page: paginated.page.map((message) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { userId, model, provider, usage, ...messageWithoutUserId } =
          message;
        const attachments = attachmentMap.get(message._id);
        return {
          ...messageWithoutUserId,
          attachments: attachments ?? [],
        };
      }),
      streams,
    };
  },
});

export const getFollowUpQuestions = authedQuery({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { threadId } = args;
    const metadata = await authorizeAccess(ctx, threadId);
    if (!metadata) {
      return [];
    }
    return metadata.followUpQuestions ?? [];
  },
});
