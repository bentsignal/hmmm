import type { CustomCtx } from "convex-helpers/server/customFunctions";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import type { SyncStreamsReturnValue } from "../../agent/client/types";
import { internal } from "../../_generated/api";
import { vStreamArgs } from "../../agent/validators";
import { getPublicFile } from "../../app/file_helpers";
import { authedQuery } from "../../convex_helpers";
import { tryCatch } from "../../lib/utils";
import { usageCheckedMutation } from "../../usage_checked_helpers";
import { getPerferredModelIfAllowed } from "../../user/info";
import { agent } from "../agents";
import { emitThreadEvent, generateGenerationId } from "./events";
import {
  authorizeAccess,
  logSystemError,
  saveUserMessage,
  validateMessage,
} from "./helpers";
import { vAttachment } from "./shared";
import { getStateForThread } from "./state";

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

export const list = authedQuery({
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

export const send = usageCheckedMutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    attachments: v.optional(v.array(vAttachment)),
  },
  handler: async (ctx, args) => {
    const { threadId, prompt, attachments } = args;
    const numAttachments = attachments?.length ?? 0;
    await validateMessage(ctx, prompt, numAttachments);
    const thread = await authorizeAccess(ctx, threadId);
    if (!thread) {
      throw new ConvexError("Thread not found");
    }
    const state = await getStateForThread(ctx, thread._id);
    if (state !== "idle") {
      throw new ConvexError("Thread is not idle");
    }
    const model = getPerferredModelIfAllowed(ctx.userPlan, ctx.userInfo?.model);
    const generationId = generateGenerationId();
    const [{ lastMessageId }] = await Promise.all([
      saveUserMessage({
        ctx,
        threadId,
        prompt,
        userInfo: ctx.userInfo,
        attachments,
      }),
      ctx.db.patch(thread._id, {
        updatedAt: Date.now(),
        followUpQuestions: [],
      }),
      emitThreadEvent(ctx, {
        threadId: thread._id,
        userId: ctx.user.subject,
        eventType: "user_message_sent",
        generationId,
      }),
    ]);
    const { data: scheduledId, error } = await tryCatch(
      ctx.scheduler.runAfter(0, internal.ai.agents.streamResponse, {
        threadId,
        promptMessageId: lastMessageId,
        model,
        generationId,
      }),
    );
    if (error) {
      console.error(error);
      await logSystemError(ctx, threadId, "G4", "Failed to generate response");
    } else {
      await ctx.db.patch(thread._id, { generationFnId: scheduledId });
    }
  },
});
