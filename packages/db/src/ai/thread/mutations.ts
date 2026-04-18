import { generateText } from "ai";
import { ConvexError, v } from "convex/values";

import { internal } from "../../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../../_generated/server";
import { abortById } from "../../agent/handlers/streams";
import { authedMutation } from "../../convex_helpers";
import { tryCatch } from "../../lib/utils";
import { usageCheckedMutation } from "../../usage_checked_helpers";
import { getPerferredModelIfAllowed } from "../../user/info";
import { agent } from "../agents";
import { modelPresets } from "../models/presets";
import { titleGeneratorPrompt } from "../prompts";
import {
  authorizeAccess,
  getMetadata,
  logSystemError,
  saveNewTitle,
  saveUserMessage,
  validateMessage,
} from "./helpers";

const vAttachment = v.object({
  key: v.string(),
  name: v.string(),
  mimeType: v.string(),
});

export const generateTitle = internalAction({
  args: {
    prompt: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { prompt, threadId } = args;
    const response = await generateText({
      model: modelPresets.titleGenerator.model,
      prompt: prompt,
      system: titleGeneratorPrompt,
    });
    await ctx.runMutation(internal.ai.thread.mutations.setTitle, {
      threadId: threadId,
      title: response.text.trim(),
    });
  },
});

export const setTitle = internalMutation({
  args: {
    title: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { title, threadId } = args;
    await saveNewTitle({ ctx, threadId, title });
  },
});

export const rename = authedMutation({
  args: {
    name: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { threadId, name } = args;
    await saveNewTitle({ ctx, threadId, title: name });
  },
});

export const create = usageCheckedMutation({
  args: {
    prompt: v.string(),
    attachments: v.optional(v.array(vAttachment)),
  },
  handler: async (ctx, args) => {
    const { prompt, attachments } = args;
    const numAttachments = attachments?.length ?? 0;
    await validateMessage(ctx, prompt, numAttachments);
    const { threadId } = await agent.createThread(ctx, {
      userId: ctx.user.subject,
      title: "New Chat",
    });
    // Set initial state directly on the unified threads row.
    const newThreadId = ctx.db.normalizeId("threads", threadId);
    if (!newThreadId) {
      throw new ConvexError("Just-created thread id failed to normalize");
    }
    await ctx.db.patch(newThreadId, {
      state: "waiting",
      pinned: false,
      updatedAt: Date.now(),
    });
    const { lastMessageId } = await saveUserMessage({
      ctx,
      threadId,
      prompt,
      userInfo: ctx.userInfo,
      attachments,
    });
    const model = getPerferredModelIfAllowed(ctx.userPlan, ctx.userInfo?.model);
    const { data: scheduledIds, error } = await tryCatch(
      Promise.all([
        ctx.scheduler.runAfter(0, internal.ai.thread.mutations.generateTitle, {
          threadId: threadId,
          prompt: prompt,
        }),
        ctx.scheduler.runAfter(0, internal.ai.agents.streamResponse, {
          threadId: threadId,
          promptMessageId: lastMessageId,
          model: model,
        }),
      ]),
    );
    if (error) {
      console.error(error);
      await logSystemError(
        ctx,
        threadId,
        "G4",
        "Failed to generate title or response",
      );
    } else {
      await ctx.db.patch(newThreadId, { generationFnId: scheduledIds[1] });
    }
    return threadId;
  },
});

export const sendMessage = usageCheckedMutation({
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
    if (thread.state !== "idle") {
      throw new ConvexError("Thread is not idle");
    }
    const model = getPerferredModelIfAllowed(ctx.userPlan, ctx.userInfo?.model);
    const [{ lastMessageId }] = await Promise.all([
      saveUserMessage({
        ctx,
        threadId,
        prompt,
        userInfo: ctx.userInfo,
        attachments,
      }),
      ctx.db.patch(thread._id, {
        state: "waiting",
        updatedAt: Date.now(),
        followUpQuestions: [],
      }),
    ]);
    const { data: scheduledId, error } = await tryCatch(
      ctx.scheduler.runAfter(0, internal.ai.agents.streamResponse, {
        threadId: args.threadId,
        promptMessageId: lastMessageId,
        model: model,
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

export const abortGeneration = authedMutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const thread = await authorizeAccess(ctx, args.threadId);
    if (!thread) {
      throw new ConvexError("Thread not found");
    }
    // If the scheduled streamResponse hasn't started yet, cancel it so it
    // never calls the LLM — zero cost, no G1/G2 error written afterward.
    if (thread.generationFnId) {
      const fn = await ctx.db.system.get(thread.generationFnId);
      if (fn?.state.kind === "pending") {
        await ctx.scheduler.cancel(thread.generationFnId);
      }
    }
    const streams = await ctx.db
      .query("streamingMessages")
      .withIndex("threadId_state_order_stepOrder", (q) =>
        q.eq("threadId", thread._id).eq("state.kind", "streaming"),
      )
      .take(100);
    for (const s of streams) {
      await abortById(ctx, { streamId: s._id, reason: "user-aborted" });
    }
    await ctx.db.patch(thread._id, {
      state: "idle",
      generationFnId: undefined,
    });
  },
});

export const deleteThread = authedMutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { threadId } = args;
    const thread = await authorizeAccess(ctx, threadId);
    if (!thread) {
      throw new ConvexError("Thread not found");
    }
    if (thread.state !== "idle") {
      throw new Error(
        "Cannot delete a thread while a response is being generated",
      );
    }
    await ctx.scheduler.runAfter(
      0,
      internal.agent.threads.deleteAllForThreadIdAsync,
      { threadId: thread._id },
    );
  },
});

export const setState = internalMutation({
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
    const thread = await getMetadata(ctx, threadId);
    if (!thread) {
      throw new ConvexError("Thread not found");
    }
    await ctx.db.patch(thread._id, { state });
  },
});

export const wasAborted = internalQuery({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const thread = await getMetadata(ctx, args.threadId);
    if (!thread) return true;
    // If the thread is already idle while our action is running, the user
    // aborted (or the row is otherwise reset). Caller should suppress
    // error logging that would leak into the UI.
    return thread.state === "idle";
  },
});

export const resetIdleIfStreaming = internalMutation({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    const thread = await getMetadata(ctx, args.threadId);
    if (!thread) return;
    if (thread.state !== "streaming") return;
    await ctx.db.patch(thread._id, {
      state: "idle",
      generationFnId: undefined,
    });
  },
});

export const togglePinned = authedMutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { threadId } = args;
    const thread = await authorizeAccess(ctx, threadId);
    if (!thread) {
      throw new ConvexError("Thread not found");
    }
    await ctx.db.patch(thread._id, {
      pinned: !(thread.pinned ?? false),
    });
  },
});

export const saveFollowUpQuestions = internalMutation({
  args: {
    threadId: v.string(),
    followUpQuestions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { threadId, followUpQuestions } = args;
    const thread = await getMetadata(ctx, threadId);
    if (!thread) {
      throw new ConvexError("Thread not found");
    }
    await ctx.db.patch(thread._id, { followUpQuestions });
  },
});
