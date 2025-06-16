import { api, components, internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { agent } from "./agent";
import { paginationOptsValidator } from "convex/server";
import { vStreamArgs } from "@convex-dev/agent/validators";
import { authorizeThreadAccess } from "./auth";

export const getThreadList = query({
  args: {},
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      return [];
    }
    const { page: threads } = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        userId: userId.subject,
        order: "desc",
        // paginationOpts: {
        //   cursor: null,
        //   numItems: 100,
        // },
      },
    );
    return threads;
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
    if (threadId === "skip" || threadId === "") {
      throw new Error("Thread ID is required");
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
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const isUserSubscribed = await ctx.runQuery(api.auth.isUserSubscribed);
    if (!isUserSubscribed) {
      throw new Error("User is not subscribed");
    }
    const { message, modelId } = args;
    const { threadId } = await agent.createThread(ctx, {
      userId: userId.subject,
      title: "New Chat",
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
  },
  handler: async (ctx, args) => {
    const { threadId, prompt, modelId } = args;
    await authorizeThreadAccess(ctx, threadId);
    const isUserSubscribed = await ctx.runQuery(api.auth.isUserSubscribed);
    if (!isUserSubscribed) {
      throw new Error("User is not subscribed");
    }
    const isThreadStreaming = await ctx.runQuery(
      api.threads.isThreadStreaming,
      {
        threadId,
      },
    );
    if (isThreadStreaming) {
      return;
    }
    const { messageId } = await agent.saveMessage(ctx, {
      threadId,
      prompt: prompt,
      skipEmbeddings: true,
    });
    ctx.scheduler.runAfter(0, internal.actions.continueThread, {
      threadId: args.threadId,
      promptMessageId: messageId,
      modelId: modelId,
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
    ctx.scheduler.runAfter(
      0,
      components.agent.threads.deleteAllForThreadIdAsync,
      {
        threadId,
      },
    );
  },
});

export const isThreadStreaming = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { threadId } = args;
    if (threadId === "skip" || threadId === "") {
      return false;
    }
    await authorizeThreadAccess(ctx, threadId);
    const streamingMessages = await ctx.runQuery(agent.component.streams.list, {
      threadId,
    });
    return streamingMessages.length > 0;
  },
});
