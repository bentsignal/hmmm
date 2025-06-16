import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    userId: v.string(),
    email: v.string(),
    access: v.optional(v.boolean()),
    waitlist: v.optional(v.boolean()),
  }).index("by_user_id", ["userId"]),
});
