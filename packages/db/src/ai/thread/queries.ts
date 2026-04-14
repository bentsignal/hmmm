import type { CustomCtx } from "convex-helpers/server/customFunctions";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { SyncStreamsReturnValue } from "../../agent/client/types";
import { vStreamArgs } from "../../agent/validators";
import { getPublicFile } from "../../app/file_helpers";
import { authedQuery } from "../../convex_helpers";
import { agent } from "../agents";
import { authorizeAccess } from "./helpers";

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

async function resolveAttachments(
  ctx: CustomCtx<typeof authedQuery>,
  raw: unknown,
  userId: string,
) {
  if (!isStringArray(raw) || raw.length === 0) {
    return [];
  }
  const fileIds = raw
    .map((id) => ctx.db.normalizeId("files", id))
    .filter((id): id is NonNullable<typeof id> => id !== null);
  const files = await Promise.all(fileIds.map((id) => ctx.db.get(id)));
  return files
    .filter((file): file is NonNullable<typeof file> => file !== null)
    .filter((file) => file.userId === userId)
    .map((file) => getPublicFile(file));
}

export const getTitle = authedQuery({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await authorizeAccess(ctx, args.threadId);
    return thread?.title;
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
    const thread = await authorizeAccess(ctx, threadId);
    return thread?.state;
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
            .query("threads")
            .withSearchIndex("title", (q) =>
              q.search("title", search).eq("userId", ctx.user.subject),
            )
            .paginate(paginationOpts)
        : await ctx.db
            .query("threads")
            .withIndex("by_user_time", (q) => q.eq("userId", ctx.user.subject))
            .order("desc")
            .paginate(paginationOpts);
    return {
      ...threads,
      page: threads.page.map((thread) => ({
        id: thread._id,
        updatedAt: thread.updatedAt ?? thread._creationTime,
        title: thread.title ?? "",
        state: thread.state ?? "idle",
        pinned: thread.pinned ?? false,
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
    const thread = await authorizeAccess(ctx, threadId);
    if (!thread) {
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
    // Resolve attachments inline now that they live on the messages row.
    const enriched = await Promise.all(
      paginated.page.map(async (message) => {
        const attachments = await resolveAttachments(
          ctx,
          message.attachments,
          ctx.user.subject,
        );
        return {
          _id: message._id,
          _creationTime: message._creationTime,
          threadId: message.threadId,
          order: message.order,
          stepOrder: message.stepOrder,
          status: message.status,
          tool: message.tool,
          message: message.message,
          text: message.text,
          reasoning: message.reasoning,
          reasoningDetails: message.reasoningDetails,
          sources: message.sources,
          warnings: message.warnings,
          finishReason: message.finishReason,
          providerMetadata: message.providerMetadata,
          error: message.error,
          attachments,
        };
      }),
    );
    return {
      ...paginated,
      page: enriched,
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
    const thread = await authorizeAccess(ctx, threadId);
    if (!thread) {
      return [];
    }
    return thread.followUpQuestions ?? [];
  },
});
