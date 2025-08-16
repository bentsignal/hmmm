import { generateText } from "ai";
import { ConvexError, v } from "convex/values";
import { components, internal } from "@/convex/_generated/api";
import {
  internalAction,
  internalMutation,
  mutation,
} from "@/convex/_generated/server";
import { agent } from "@/convex/ai/agents";
import { modelPresets } from "../ai/models";
import { titleGeneratorPrompt } from "../ai/prompts";
import {
  getThreadMetadata,
  logSystemError,
  saveNewMessage,
  threadMessageCheck,
} from "./thread_helpers";
import { tryCatch } from "@/lib/utils";

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
    await ctx.runMutation(internal.thread.thread_mutations.updateThreadTitle, {
      threadId: threadId,
      title: response.text.trim(),
    });
  },
});

export const requestNewThread = mutation({
  args: {
    prompt: v.string(),
    // file names
    attachments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { prompt, attachments } = args;
    const numAttachments = attachments?.length || 0;
    // auth, usage, input val, rate limit
    const userId = await threadMessageCheck(ctx, prompt, numAttachments);
    // create new thread in agent component table, as well as
    // new document in separate threadMetadata table
    const { threadId } = await agent.createThread(ctx, {
      userId: userId.subject,
      title: "New Chat",
    });
    // create metadata doc for thread and store first message
    const [{ lastMessageId }] = await Promise.all([
      saveNewMessage(ctx, threadId, prompt, attachments),
      ctx.db.insert("threadMetadata", {
        userId: userId.subject,
        title: "New Chat",
        threadId: threadId,
        updatedAt: Date.now(),
        state: "waiting",
      }),
    ]);
    // generate title for new thread, and start response
    const { error } = await tryCatch(
      Promise.all([
        ctx.scheduler.runAfter(
          0,
          internal.thread.thread_mutations.generateTitle,
          {
            threadId: threadId,
            prompt: prompt,
          },
        ),
        ctx.scheduler.runAfter(0, internal.ai.agents.streamResponse, {
          threadId: threadId,
          promptMessageId: lastMessageId,
        }),
      ]),
    );
    if (error) {
      console.error(error);
      logSystemError(
        ctx,
        threadId,
        "G4",
        "Failed to generate title or response",
      );
    }
    return threadId;
  },
});

export const newThreadMessage = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    attachments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { threadId, prompt, attachments } = args;
    const numAttachments = attachments?.length || 0;
    const userId = await threadMessageCheck(ctx, prompt, numAttachments);
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
    // save new message to thread, update thread state, clear previous follow up questions
    const [{ lastMessageId }] = await Promise.all([
      saveNewMessage(ctx, threadId, prompt, attachments),
      ctx.db.patch(metadata._id, {
        state: "waiting",
        updatedAt: Date.now(),
      }),
      ctx.db.patch(metadata._id, {
        followUpQuestions: [],
      }),
    ]);
    // schedule response generation
    const { error } = await tryCatch(
      ctx.scheduler.runAfter(0, internal.ai.agents.streamResponse, {
        threadId: args.threadId,
        promptMessageId: lastMessageId,
      }),
    );
    if (error) {
      console.error(error);
      logSystemError(ctx, threadId, "G4", "Failed to generate response");
    }
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
    await agent.updateThreadMetadata(ctx, {
      threadId: threadId,
      patch: {
        title: title,
      },
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

export const renameThread = mutation({
  args: {
    threadId: v.string(),
    newTitle: v.string(),
  },
  handler: async (ctx, args) => {
    // auth check
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    // get thread metadata
    const { threadId, newTitle } = args;
    const metadata = await getThreadMetadata(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    if (metadata.userId !== userId.subject) {
      throw new Error("Unauthorized");
    }
    // update thread title
    await ctx.db.patch(metadata._id, {
      title: newTitle,
    });
  },
});

export const toggleThreadPin = mutation({
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
    // toggle thread pin
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
    const metadata = await getThreadMetadata(ctx, threadId);
    if (!metadata) {
      throw new ConvexError("Thread not found");
    }
    await ctx.db.patch(metadata._id, {
      followUpQuestions: followUpQuestions,
    });
  },
});
