import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    userId: v.string(),
    email: v.string(),
    unlimited: v.optional(v.boolean()),
    waitlist: v.optional(v.boolean()),
    admin: v.optional(v.boolean()),
  }).index("by_user_id", ["userId"]),
  threadMetadata: defineTable({
    title: v.string(),
    threadId: v.string(),
    userId: v.string(),
    updatedAt: v.number(),
    state: v.union(
      v.literal("idle"),
      v.literal("waiting"),
      v.literal("streaming"),
    ),
    pinned: v.optional(v.boolean()),
    followUpQuestions: v.optional(v.array(v.string())),
  })
    .index("by_user_time", ["userId", "updatedAt"])
    .index("by_thread_id", ["threadId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),
  messageMetadata: defineTable({
    messageId: v.string(),
    threadId: v.string(),
    userId: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    usageId: v.optional(v.id("usage")),
  }).index("by_user_thread", ["userId", "threadId"]),
  usage: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("message"),
      v.literal("transcription"),
      v.literal("tool_call"),
    ),
    cost: v.number(),
  }).index("by_user_type", ["userId", "type"]),
  suggestions: defineTable({
    prompt: v.string(),
  }),
});
