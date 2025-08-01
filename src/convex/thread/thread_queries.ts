import type { SyncStreamsReturnValue } from "@convex-dev/agent";
import { vStreamArgs } from "@convex-dev/agent/validators";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "@/convex/_generated/server";
import { agent } from "@/convex/agents";
import { authorizeThreadAccess } from "./thread_helpers";

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
