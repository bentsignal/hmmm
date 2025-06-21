import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    userId: v.string(),
    email: v.string(),
    access: v.optional(v.boolean()),
    waitlist: v.optional(v.boolean()),
  }).index("by_user_id", ["userId"]),
  threadMetadata: defineTable({
    title: v.string(),
    threadId: v.string(),
    userId: v.string(),
    updatedAt: v.number(),
    state: v.union(
      v.literal("idle"),
      v.literal("waiting"),
      v.literal("thinking"),
      v.literal("streaming"),
    ),
  })
    .index("by_user_time", ["userId", "updatedAt"])
    .index("by_thread_id", ["threadId"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    }),
});
