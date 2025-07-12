import { ConvexError, v } from "convex/values";
import { components, internal } from "@/convex/_generated/api";
import { internalMutation, mutation } from "@/convex/_generated/server";
import { agent } from "@/convex/agent";
import { messageSendRateLimit } from "@/convex/limiter";
import { getCurrentUsage } from "@/convex/usage";
import { getThreadMetadata } from "./thread_helpers";
import { convexCategoryEnum } from "@/features/prompts/types/prompt-types";

export const requestNewThread = mutation({
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
    ctx.scheduler.runAfter(0, internal.thread.thread_actions.generateTitle, {
      threadId: threadId,
      message: args.message,
    });
    ctx.scheduler.runAfter(0, internal.thread.thread_actions.generateResponse, {
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
    ctx.scheduler.runAfter(0, internal.thread.thread_actions.generateResponse, {
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
