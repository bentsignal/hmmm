import { components, internal } from "./_generated/api";
import {
  internalAction,
  mutation,
  MutationCtx,
  query,
  QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { agent } from "./agent";
import { paginationOptsValidator } from "convex/server";
import { vStreamArgs } from "@convex-dev/agent/validators";

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
        paginationOpts: {
          cursor: null,
          numItems: 100,
        },
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

const authorizeThreadAccess = async (
  ctx: QueryCtx | MutationCtx,
  threadId: string,
) => {
  const userId = await ctx.auth.getUserIdentity();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const metadata = await agent.getThreadMetadata(ctx, {
    threadId,
  });
  if (metadata.userId !== userId.subject) {
    throw new Error("Unauthorized");
  }
  return metadata.userId;
};

export const requestNewThreadCreation = mutation({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    const { threadId } = await agent.createThread(ctx, {
      userId: userId.subject,
      title: "New Chat",
    });
    const { messageId } = await agent.saveMessage(ctx, {
      threadId,
      prompt: args.message,
      skipEmbeddings: true,
    });
    await Promise.all([
      ctx.scheduler.runAfter(0, internal.actions.generateTitle, {
        threadId: threadId,
        message: args.message,
      }),
      ctx.scheduler.runAfter(0, internal.threads.continueThread, {
        threadId: threadId,
        promptMessageId: messageId,
      }),
    ]);
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
    await authorizeThreadAccess(ctx, threadId);
    const { messageId } = await agent.saveMessage(ctx, {
      threadId,
      prompt: prompt,
      skipEmbeddings: true,
    });
    ctx.scheduler.runAfter(0, internal.threads.continueThread, {
      threadId: args.threadId,
      promptMessageId: messageId,
    });
  },
});

export const continueThread = internalAction({
  args: {
    threadId: v.string(),
    promptMessageId: v.string(),
  },
  handler: async (ctx, args) => {
    const { threadId, promptMessageId } = args;
    const { thread } = await agent.continueThread(ctx, {
      threadId: threadId,
    });
    const result = await thread.streamText(
      { promptMessageId },
      { saveStreamDeltas: true },
    );
    await result.consumeStream();
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
