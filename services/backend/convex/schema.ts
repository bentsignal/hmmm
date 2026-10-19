import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The host's own tables. Messages and profiles live in their plugins; these
// hold what Vera's assistant accounts (bots.ts) keep for themselves.

/** How far a bug report has come, in order (see supportReports.ts). */
export const reportStage = v.union(
  v.literal("reported"),
  v.literal("pickedUp"),
  v.literal("inProgress"),
  v.literal("fixed"),
  v.literal("live"),
  v.literal("closed"),
);

/** Vera's assistant accounts by username (bots.ts). */
export const botName = v.union(v.literal("support"), v.literal("vera"));

export default defineSchema({
  /**
   * One per person's DM with an assistant: when its next reply runs, whether
   * one is running, and how many it has sent today.
   */
  botConversations: defineTable({
    accountId: v.string(),
    /** The newest message of theirs a finished reply has seen. */
    answeredThrough: v.optional(v.number()),
    /** They wrote before the assistant answered anyone (supportBacklog.ts). */
    backlog: v.optional(v.boolean()),
    bot: botName,
    conversationId: v.string(),
    /** Replies started since `dayStart`, for the daily limit. */
    dayStart: v.number(),
    limitNoticeSent: v.optional(v.boolean()),
    /** A message arrived while a reply was running: answer it next. */
    rerun: v.optional(v.boolean()),
    runningSince: v.optional(v.number()),
    runsToday: v.number(),
    /** When the reply to the latest message runs; older wake-ups skip. */
    wakeAt: v.number(),
  }).index("by_conversation", ["conversationId"]),
  /** What an assistant remembers about one person, at their request. */
  botNotes: defineTable({
    accountId: v.string(),
    bot: botName,
    text: v.string(),
  }).index("by_bot_account", ["bot", "accountId"]),
  /**
   * The app version and device an account last wrote to support from,
   * reported by the app, for bug reports. Nothing else about the device.
   */
  clientInfo: defineTable({
    accountId: v.string(),
    appVersion: v.string(),
    channel: v.string(),
    device: v.string(),
    os: v.string(),
    reportedAt: v.number(),
    update: v.string(),
  }).index("by_account", ["accountId"]),
  /**
   * What an image someone sent an assistant shows, written once by a
   * vision model (agent.ts), since the main model can't see images.
   */
  imageDescriptions: defineTable({
    text: v.string(),
    url: v.string(),
  }).index("by_url", ["url"]),
  /** What support knows about someone who reports bugs. */
  supportReporters: defineTable({
    accountId: v.string(),
    /** Whether they want technical details (GitHub links); unknown until asked. */
    developer: v.optional(v.boolean()),
    /** When support told them reports are public (`share_privacy_notice`). */
    noticeSharedAt: v.optional(v.number()),
  }).index("by_account", ["accountId"]),
  /** A bug someone reported to support, and its GitHub issue. */
  bugReports: defineTable({
    accountId: v.string(),
    conversationId: v.string(),
    /** The commit that fixed it and what it needs to reach people. */
    fix: v.optional(
      v.object({
        app: v.boolean(),
        backend: v.boolean(),
        sha: v.string(),
      }),
    ),
    issueNumber: v.optional(v.number()),
    issueUrl: v.optional(v.string()),
    /** The latest stage the reporter has heard about. */
    notifiedStage: reportStage,
    pullRequest: v.optional(v.object({ number: v.number(), url: v.string() })),
    stage: reportStage,
    /** A short, plain description for messages to the reporter. */
    summary: v.string(),
    title: v.string(),
    /** Still followed on GitHub (not live or closed yet). */
    tracking: v.boolean(),
  })
    .index("by_account", ["accountId"])
    .index("by_tracking", ["tracking"]),
});
