import type { SyncStreamsReturnValue } from "@convex-dev/agent";
import { vStreamArgs } from "@convex-dev/agent/validators";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  MutationCtx,
  query,
  QueryCtx,
} from "./_generated/server";
import { agent } from "./agent";
import { messageSendRateLimit } from "./limiter";
import { getCurrentUsage } from "./usage";
import { isAdmin } from "./users";
import { convexCategoryEnum } from "@/features/prompts/types/prompt-types";

// get thread metadata from table separate from agent component. this
// is where all custom info related to thread state is located
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

// verify that a user is allowed to access a thread. If they are,
// return the thread metadata. Admin's can access any thread
const authorizeThreadAccess = async (
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

export const requestNewThreadCreation = mutation({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.message.length > 20000) {
      throw new ConvexError(
        "Message is too long. Please shorten your message.",
      );
    }
    // auth check
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new ConvexError("Unauthorized");
    }
    // check usage and rate limiting
    const [usage] = await Promise.all([
      getCurrentUsage(ctx, userId.subject),
      messageSendRateLimit(ctx, userId.subject),
    ]);
    if (usage.limitHit) {
      throw new ConvexError("User has reached usage limit");
    }
    // create new thread in agent component table, as well as
    // new document in separate threadMetadata table
    const { threadId } = await agent.createThread(ctx, {
      userId: userId.subject,
      title: "New Chat",
    });
    // create metadata doc for thread and store first message
    const [{ messageId }] = await Promise.all([
      agent.saveMessage(ctx, {
        threadId,
        prompt: args.message,
        skipEmbeddings: true,
      }),
      ctx.db.insert("threadMetadata", {
        userId: userId.subject,
        title: "New Chat",
        threadId: threadId,
        updatedAt: Date.now(),
        state: "waiting",
      }),
    ]);
    // generate title for new thread, and start response
    ctx.scheduler.runAfter(0, internal.generation.generateTitle, {
      threadId: threadId,
      message: args.message,
    });
    ctx.scheduler.runAfter(0, internal.generation.continueThread, {
      threadId: threadId,
      promptMessageId: messageId,
      prompt: args.message,
      userId: userId.subject,
    });
    return threadId;
  },
});

export const newThreadMessage = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const { threadId, prompt } = args;
    if (prompt.length > 20000) {
      throw new ConvexError(
        "Message is too long. Please shorten your message.",
      );
    }
    // auth check
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new ConvexError("Unauthorized");
    }
    // check usage and rate limiting
    const [usage] = await Promise.all([
      getCurrentUsage(ctx, userId.subject),
      messageSendRateLimit(ctx, userId.subject),
    ]);
    if (usage.limitHit) {
      throw new ConvexError("User has reached usage limit");
    }
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
    // save new message, schedule response action
    const [{ messageId }] = await Promise.all([
      agent.saveMessage(ctx, {
        threadId,
        prompt: prompt,
        skipEmbeddings: true,
      }),
      ctx.db.patch(metadata._id, {
        state: "waiting",
        updatedAt: Date.now(),
      }),
    ]);
    ctx.scheduler.runAfter(0, internal.generation.continueThread, {
      threadId: args.threadId,
      promptMessageId: messageId,
      prompt: prompt,
      userId: userId.subject,
    });
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

/*

  Title of thread (shown in sidebar)

*/

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

/*

  Current state of thread

*/

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

/*

  Thread categories

*/

export const updateThreadCategory = internalMutation({
  args: {
    threadId: v.string(),
    category: convexCategoryEnum,
  },
  handler: async (ctx, args) => {
    const { threadId, category } = args;
    const metadata = await getThreadMetadata(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    await ctx.db.patch(metadata._id, {
      category: category,
    });
  },
});

export const getThreadCategory = internalQuery({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { threadId } = args;
    const metadata = await getThreadMetadata(ctx, threadId);
    return metadata?.category;
  },
});
