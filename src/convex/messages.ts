import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const get = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      return [];
    }
    const messages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("threadId"), args.threadId))
      .collect();
    return messages;
  },
});

export const create = mutation({
  args: {
    threadId: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    // insert the prompt message from the user
    await ctx.db.insert("messages", {
      threadId: args.threadId,
      value: args.message,
      type: "prompt",
    });
    // create an empty response message
    const responseId = await ctx.db.insert("messages", {
      threadId: args.threadId,
      value: "",
      type: "response",
    });
    // combine all previous repsonses
    const previousMessages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("threadId"), args.threadId))
      .collect();
    const previousMessagesString = previousMessages
      .map((m) => `${m.type === "prompt" ? "User: " : "Assistant: "}${m.value}`)
      .join("\n");
    // generate a response
    await ctx.scheduler.runAfter(0, internal.actions.generateResponse, {
      message: previousMessagesString,
      responseId: responseId,
    });
  },
});

export const patchResponse = internalMutation({
  args: {
    messageId: v.id("messages"),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      value: args.value,
    });
  },
});
