import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    userId: v.string(),
    email: v.string(),
    unlimited: v.optional(v.boolean()),
    waitlist: v.optional(v.boolean()),
    newsletter: v.optional(v.boolean()),
    admin: v.optional(v.boolean()),
  }).index("by_user_id", ["userId"]),
  personalInfo: defineTable({
    userId: v.string(),
    name: v.optional(v.string()),
    location: v.optional(v.string()),
    language: v.optional(v.string()),
    notes: v.optional(v.string()),
    model: v.optional(v.string()),
  }).index("by_user_id", ["userId"]),
  files: defineTable({
    userId: v.string(),
    fileName: v.string(),
    fileType: v.string(),
    key: v.string(),
    size: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_key", ["key"])
    .searchIndex("search_file_name", {
      searchField: "fileName",
      filterFields: ["userId"],
    }),
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
    pinned: v.boolean(),
    followUpQuestions: v.optional(v.array(v.string())),
  })
    .index("by_user_time", ["userId", "pinned", "updatedAt"])
    .index("by_thread_id", ["threadId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),
  messageMetadata: defineTable({
    messageId: v.string(),
    threadId: v.string(),
    userId: v.string(),
    attachments: v.optional(v.array(v.id("files"))),
  })
    .index("by_user", ["userId"])
    .index("by_message_id", ["messageId"]),
  usage: defineTable({
    userId: v.string(),
    type: v.union(
      v.literal("message"),
      v.literal("transcription"),
      v.literal("tool_call"),
    ),
    cost: v.number(),
  }),
  suggestions: defineTable({
    prompt: v.string(),
  }),
});
