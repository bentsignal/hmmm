import { api, components, internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { agent } from "./agent";
import { paginationOptsValidator } from "convex/server";
import { vStreamArgs } from "@convex-dev/agent/validators";
import { authorizeThreadAccess } from "./auth";

export const getThreadList = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const { paginationOpts, search } = args;
    if (search.trim().length > 0) {
      const threads = await ctx.db
        .query("threadMetadata")
        .withSearchIndex("search_title", (q) =>
          q.search("title", search).eq("userId", userId.subject),
        )
        .paginate(paginationOpts);
      return threads;
    } else {
      const threads = await ctx.db
        .query("threadMetadata")
        .withIndex("by_user_time", (q) => q.eq("userId", userId.subject))
        .order("desc")
        .paginate(paginationOpts);
      return threads;
    }
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
    await authorizeThreadAccess(ctx, threadId);
    const streams = await agent.syncStreams(ctx, {
      threadId,
      streamArgs,
    });
    const paginated = await agent.listMessages(ctx, {
      threadId,
      paginationOpts,
    });
    return {
      ...paginated,
      streams,
    };
  },
});

export const requestNewThreadCreation = mutation({
  args: {
    message: v.string(),
    modelId: v.string(),
    key: v.optional(v.string()),
    userId: v.optional(v.string()),
    useSearch: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let uid;
    if (args.key && args.userId) {
      if (args.key !== process.env.CONVEX_INTERNAL_API_KEY) {
        throw new Error("Unauthorized");
      }
      uid = args.userId;
    } else {
      const userId = await ctx.auth.getUserIdentity();
      if (!userId) {
        throw new Error("Unauthorized");
      }
      uid = userId.subject;
      const isUserSubscribed = await ctx.runQuery(api.auth.isUserSubscribed);
      if (!isUserSubscribed) {
        throw new Error("User is not subscribed");
      }
    }
    const { message, modelId, useSearch } = args;
    const { threadId } = await agent.createThread(ctx, {
      userId: uid,
      title: "New Chat",
    });
    await ctx.db.insert("threadMetadata", {
      userId: uid,
      title: "New Chat",
      threadId: threadId,
      updatedAt: Date.now(),
      state: "waiting",
    });
    const { messageId } = await agent.saveMessage(ctx, {
      threadId,
      prompt: message,
      skipEmbeddings: true,
    });
    await Promise.all([
      ctx.scheduler.runAfter(0, internal.actions.generateTitle, {
        threadId: threadId,
        message: message,
      }),
      ctx.scheduler.runAfter(0, internal.actions.continueThread, {
        threadId: threadId,
        promptMessageId: messageId,
        modelId: modelId,
        useSearch: useSearch,
        prompt: message,
      }),
    ]);
    return threadId;
  },
});

export const newThreadMessage = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    modelId: v.string(),
    useSearch: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { threadId, prompt, modelId, useSearch } = args;
    await authorizeThreadAccess(ctx, threadId);
    const isUserSubscribed = await ctx.runQuery(api.auth.isUserSubscribed);
    if (!isUserSubscribed) {
      throw new Error("User is not subscribed");
    }
    const metadata = await ctx.db
      .query("threadMetadata")
      .withIndex("by_thread_id", (q) => q.eq("threadId", threadId))
      .first();
    if (!metadata) {
      throw new Error("Metadata not found");
    }
    if (metadata.state !== "idle") {
      throw new Error("Thread is not idle");
    }
    await ctx.db.patch(metadata._id, {
      state: "waiting",
      updatedAt: Date.now(),
    });
    const { messageId } = await agent.saveMessage(ctx, {
      threadId,
      prompt: prompt,
      skipEmbeddings: true,
    });
    ctx.scheduler.runAfter(0, internal.actions.continueThread, {
      threadId: args.threadId,
      promptMessageId: messageId,
      modelId: modelId,
      useSearch: useSearch,
      prompt: prompt,
    });
  },
});

export const deleteThread = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { threadId } = args;
    await authorizeThreadAccess(ctx, threadId);
    const metadata = await ctx.db
      .query("threadMetadata")
      .withIndex("by_thread_id", (q) => q.eq("threadId", threadId))
      .first();
    if (metadata) {
      await ctx.db.delete(metadata._id);
    }
    ctx.scheduler.runAfter(
      0,
      components.agent.threads.deleteAllForThreadIdAsync,
      {
        threadId,
      },
    );
  },
});

export const getThreadTitle = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { threadId } = args;
    if (threadId === "skip" || threadId === "" || threadId === "xr") {
      return "QBE";
    }
    await authorizeThreadAccess(ctx, threadId);
    const metadata = await ctx.db
      .query("threadMetadata")
      .withIndex("by_thread_id", (q) => q.eq("threadId", threadId))
      .first();
    if (!metadata) {
      throw new Error("Metadata not found");
    }
    return metadata.title;
  },
});

export const updateThreadTitle = internalMutation({
  args: {
    title: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { title, threadId } = args;
    const metadata = await ctx.db
      .query("threadMetadata")
      .withIndex("by_thread_id", (q) => q.eq("threadId", threadId))
      .first();
    if (!metadata) {
      throw new Error("Metadata not found");
    }
    await ctx.db.patch(metadata._id, {
      title: title,
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
    const metadata = await ctx.db
      .query("threadMetadata")
      .withIndex("by_thread_id", (q) => q.eq("threadId", threadId))
      .first();
    if (!metadata) {
      throw new Error("Metadata not found");
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
    if (threadId === "skip" || threadId === "" || threadId === "xr") {
      return "idle";
    }
    await authorizeThreadAccess(ctx, threadId);
    const metadata = await ctx.db
      .query("threadMetadata")
      .withIndex("by_thread_id", (q) => q.eq("threadId", threadId))
      .first();
    if (!metadata) {
      throw new Error("Metadata not found");
    }
    return metadata.state;
  },
});
