import { defineTable } from "convex/server";
import { v } from "convex/values";

import {
  vFinishReason,
  vLanguageModelCallWarning,
  vMessage,
  vMessageStatus,
  vProviderMetadata,
  vProviderOptions,
  vReasoningDetails,
  vSource,
  vThreadStatus,
  vUsage,
} from "./validators";

/**
 * Tables that used to live inside the `@convex-dev/agent` component, now
 * inlined into the host app and merged with the previously-parallel
 * `threadMetadata` / `messageMetadata` tables.
 *
 * Spread into the host schema in `packages/db/src/schema.ts`.
 */
export const agentTables = {
  threads: defineTable({
    // Identity
    userId: v.optional(v.string()),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    status: vThreadStatus,
    parentThreadIds: v.optional(v.array(v.id("threads"))),

    // Fields folded in from the old `threadMetadata` table
    state: v.optional(
      v.union(v.literal("idle"), v.literal("waiting"), v.literal("streaming")),
    ),
    pinned: v.optional(v.boolean()),
    updatedAt: v.optional(v.number()),
    followUpQuestions: v.optional(v.array(v.string())),
  })
    .index("userId", ["userId"])
    .index("by_user_time", ["userId", "pinned", "updatedAt"])
    .searchIndex("title", { searchField: "title", filterFields: ["userId"] }),

  messages: defineTable({
    userId: v.optional(v.string()),
    threadId: v.id("threads"),
    order: v.number(),
    stepOrder: v.number(),
    error: v.optional(v.string()),
    status: vMessageStatus,

    // Context on how it was generated
    agentName: v.optional(v.string()),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
    providerOptions: v.optional(vProviderOptions),

    // The result
    message: v.optional(vMessage),
    tool: v.boolean(),
    text: v.optional(v.string()),

    // Result metadata
    usage: v.optional(vUsage),
    providerMetadata: v.optional(vProviderMetadata),
    sources: v.optional(v.array(vSource)),
    warnings: v.optional(v.array(vLanguageModelCallWarning)),
    finishReason: v.optional(vFinishReason),
    reasoning: v.optional(v.string()),
    reasoningDetails: v.optional(vReasoningDetails),

    // Folded in from the old `messageMetadata` table
    attachments: v.optional(v.array(v.id("files"))),
  })
    .index("threadId_status_tool_order_stepOrder", [
      "threadId",
      "status",
      "tool",
      "order",
      "stepOrder",
    ])
    .searchIndex("text_search", {
      searchField: "text",
      filterFields: ["userId", "threadId"],
    }),

  streamingMessages: defineTable({
    userId: v.optional(v.string()),
    agentName: v.optional(v.string()),
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
    providerOptions: v.optional(vProviderOptions),
    format: v.optional(
      v.union(v.literal("UIMessageChunk"), v.literal("TextStreamPart")),
    ),
    threadId: v.id("threads"),
    order: v.number(),
    stepOrder: v.number(),
    state: v.union(
      v.object({
        kind: v.literal("streaming"),
        lastHeartbeat: v.number(),
        timeoutFnId: v.optional(v.id("_scheduled_functions")),
      }),
      v.object({
        kind: v.literal("finished"),
        endedAt: v.number(),
        cleanupFnId: v.optional(v.id("_scheduled_functions")),
      }),
      v.object({ kind: v.literal("aborted"), reason: v.string() }),
    ),
  }).index("threadId_state_order_stepOrder", [
    "threadId",
    "state.kind",
    "order",
    "stepOrder",
  ]),

  streamDeltas: defineTable({
    streamId: v.id("streamingMessages"),
    start: v.number(),
    end: v.number(),
    parts: v.array(v.any()),
  }).index("streamId_start_end", ["streamId", "start", "end"]),
};
