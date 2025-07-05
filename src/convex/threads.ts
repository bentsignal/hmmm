import { components, internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { agent } from "./agent";
import { paginationOptsValidator } from "convex/server";
import { vStreamArgs } from "@convex-dev/agent/validators";
import { authorizeThreadAccess } from "./auth";
import { convexCategoryEnum } from "@/features/prompts/types/prompt-types";
import { getCurrentUsage } from "./usage";

// get thread metadata from table separate from agent component. this
// is where all custom info related to thread state is located
const getThreadMetadata = async (ctx: QueryCtx, threadId: string) => {
  const metadata = await ctx.db
    .query("threadMetadata")
    .withIndex("by_thread_id", (q) => q.eq("threadId", threadId))
    .first();
  if (!metadata) {
    throw new Error("Metadata not found");
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
    if (search.trim().length > 0) {
      // filter threads by search term
      const threads = await ctx.db
        .query("threadMetadata")
        .withSearchIndex("search_title", (q) =>
          q.search("title", search).eq("userId", userId.subject),
        )
        .paginate(paginationOpts);
      return threads;
    } else {
      // get all threads for user
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
    // auth check is done here
    await authorizeThreadAccess(ctx, threadId);
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
      streams,
    };
  },
});

export const requestNewThreadCreation = mutation({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // auth & sub check
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const usage = await getCurrentUsage(ctx, userId.subject);
    if (usage.limitHit) {
      throw new Error("User has reached usage limit");
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
    // auth & sub check
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const usage = await getCurrentUsage(ctx, userId.subject);
    if (usage.limitHit) {
      throw new Error("User has reached usage limit");
    }
    // get thread metadata
    const metadata = await getThreadMetadata(ctx, threadId);
    if (metadata.userId !== userId.subject) {
      throw new Error("Unauthorized");
    }
    if (metadata.state !== "idle") {
      throw new Error("Thread is not idle");
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

export const getThreadTitle = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const { threadId } = args;
    const metadata = await getThreadMetadata(ctx, threadId);
    if (metadata.userId !== userId.subject) {
      throw new Error("Unauthorized");
    }
    return metadata?.title;
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
    const metadata = await getThreadMetadata(ctx, threadId);
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
    if (args.threadId.trim().length === 0) {
      return "idle";
    }
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const { threadId } = args;
    const metadata = await getThreadMetadata(ctx, threadId);
    if (metadata.userId !== userId.subject) {
      throw new Error("Unauthorized");
    }
    return metadata.state;
  },
});

export const updateThreadCategory = internalMutation({
  args: {
    threadId: v.string(),
    category: convexCategoryEnum,
  },
  handler: async (ctx, args) => {
    const { threadId, category } = args;
    const metadata = await getThreadMetadata(ctx, threadId);
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
