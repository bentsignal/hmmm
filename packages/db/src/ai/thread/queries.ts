import type { SyncStreamsReturnValue } from "@convex-dev/agent";
import { vStreamArgs } from "@convex-dev/agent/validators";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { LibraryFile } from "../../types/library";
import { getPublicFile } from "../../app/file_helpers";
import { authedQuery } from "../../convex_helpers";
import { agent } from "../agents";
import { authorizeAccess } from "./helpers";

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
    const threads =
      search.trim().length > 0
        ? await ctx.db
            .query("threadMetadata")
            .withSearchIndex("search_title", (q) =>
              q.search("title", search).eq("userId", ctx.user.subject),
            )
            .paginate(paginationOpts)
        : await ctx.db
            .query("threadMetadata")
            .withIndex("by_user_time", (q) => q.eq("userId", ctx.user.subject))
            .order("desc")
            .paginate(paginationOpts);
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
    const metadata = await authorizeAccess(ctx, threadId);
    if (!metadata) {
      const streamsFallback =
        !streamArgs || streamArgs.kind === "list"
          ? ({ kind: "list", messages: [] } satisfies SyncStreamsReturnValue)
          : ({ kind: "deltas", deltas: [] } satisfies SyncStreamsReturnValue);
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
      agent.syncStreams(ctx, { threadId, streamArgs }),
      agent.listMessages(ctx, { threadId, paginationOpts }),
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
        if (!messageMetadata?.attachments) {
          return { id: messageId, attachments: null };
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
        return { id: messageId, attachments: publicFiles };
      }),
    );
    const attachmentMap = new Map<string, LibraryFile[]>();
    for (const message of messageAttachments) {
      if (message.attachments) {
        attachmentMap.set(message.id, message.attachments);
      }
    }
    return {
      ...paginated,
      page: paginated.page.map((message) => {
        const {
          userId: _userId,
          model: _model,
          provider: _provider,
          usage: _usage,
          ...rest
        } = message;
        const attachments = attachmentMap.get(message._id);
        return { ...rest, attachments: attachments ?? [] };
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
