import { generateText } from "ai";
import { ConvexError, v } from "convex/values";

import { components, internal } from "../../_generated/api";
import { internalAction, internalMutation } from "../../_generated/server";
import { authedMutation } from "../../convex_helpers";
import { tryCatch } from "../../lib/utils";
import { getPerferredModelIfAllowed, getUserInfoHelper } from "../../user/info";
import { agent } from "../agents";
import { modelPresets } from "../models/helpers";
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

export const create = authedMutation({
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
    const userInfo = await getUserInfoHelper(ctx);
    const [{ lastMessageId }] = await Promise.all([
      saveUserMessage({ ctx, threadId, prompt, userInfo, attachments }),
      ctx.db.insert("threadMetadata", {
        userId: ctx.user.subject,
        title: "New Chat",
        threadId: threadId,
        updatedAt: Date.now(),
        state: "waiting",
        pinned: false,
      }),
    ]);
    const model = await getPerferredModelIfAllowed(ctx, userInfo?.model);
    const { error } = await tryCatch(
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
    }
    return threadId;
  },
});

export const sendMessage = authedMutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    attachments: v.optional(v.array(vAttachment)),
  },
  handler: async (ctx, args) => {
    const { threadId, prompt, attachments } = args;
    const numAttachments = attachments?.length ?? 0;
    await validateMessage(ctx, prompt, numAttachments);
    const metadata = await authorizeAccess(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    if (metadata.state !== "idle") {
      throw new ConvexError("Thread is not idle");
    }
    const userInfo = await getUserInfoHelper(ctx);
    const model = await getPerferredModelIfAllowed(ctx, userInfo?.model);
    const [{ lastMessageId }] = await Promise.all([
      saveUserMessage({ ctx, threadId, prompt, userInfo, attachments }),
      ctx.db.patch(metadata._id, {
        state: "waiting",
        updatedAt: Date.now(),
      }),
      ctx.db.patch(metadata._id, {
        followUpQuestions: [],
      }),
    ]);
    const { error } = await tryCatch(
      ctx.scheduler.runAfter(0, internal.ai.agents.streamResponse, {
        threadId: args.threadId,
        promptMessageId: lastMessageId,
        model: model,
      }),
    );
    if (error) {
      console.error(error);
      await logSystemError(ctx, threadId, "G4", "Failed to generate response");
    }
  },
});

export const deleteThread = authedMutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { threadId } = args;
    const metadata = await authorizeAccess(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    if (metadata.state !== "idle") {
      throw new Error(
        "Cannot delete a thread while a response is being generated",
      );
    }
    await ctx.db.delete(metadata._id);
    await ctx.scheduler.runAfter(
      0,
      components.agent.threads.deleteAllForThreadIdAsync,
      { threadId },
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
    const metadata = await getMetadata(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    await ctx.db.patch(metadata._id, { state });
  },
});

export const togglePinned = authedMutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const { threadId } = args;
    const metadata = await authorizeAccess(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    await ctx.db.patch(metadata._id, {
      pinned: !metadata.pinned,
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
    const metadata = await getMetadata(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    await ctx.db.patch(metadata._id, { followUpQuestions });
  },
});
