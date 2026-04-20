import { v } from "convex/values";

import { vReasoningDetails, vSource } from "../../agent/validators/content";
import { vMessage } from "../../agent/validators/message";
import {
  vFinishReason,
  vLanguageModelCallWarning,
  vMessageStatus,
  vProviderMetadata,
} from "../../agent/validators/shared";
import { vStreamDelta, vStreamMessage } from "../../agent/validators/stream";

export const vAttachment = v.object({
  key: v.string(),
  name: v.string(),
  mimeType: v.string(),
});

/**
 * Shape of the attachment objects returned by `getPublicFile` in
 * `src/app/file_helpers.ts`. Duplicated here as a Convex validator so query
 * `returns:` declarations can describe enriched message payloads.
 */
export const vPublicFile = v.object({
  id: v.id("files"),
  key: v.string(),
  url: v.string(),
  fileName: v.string(),
  mimeType: v.string(),
  size: v.number(),
});

/**
 * Validator for the `streams` field returned by the `list` thread query.
 * Always present on the response as a concrete variant — either a flat
 * list of stream messages or a batch of deltas. The "no streams requested"
 * case is represented by an empty list variant so consumers can rely on
 * `streams.kind` existing.
 */
export const vListThreadStreams = v.union(
  v.object({
    kind: v.literal("list"),
    messages: v.array(vStreamMessage),
  }),
  v.object({
    kind: v.literal("deltas"),
    deltas: v.array(vStreamDelta),
  }),
);

/**
 * Validator for the enriched message payload produced by the `list` thread
 * query — `MessageDoc` pruned to just the fields the UI consumes, with the
 * raw `Id<"files">[]` replaced by fully-resolved `vPublicFile` objects.
 */
export const vEnrichedMessage = v.object({
  _id: v.string(),
  _creationTime: v.number(),
  threadId: v.string(),
  order: v.number(),
  stepOrder: v.number(),
  status: vMessageStatus,
  tool: v.boolean(),
  message: v.optional(vMessage),
  text: v.optional(v.string()),
  reasoning: v.optional(v.string()),
  reasoningDetails: v.optional(vReasoningDetails),
  sources: v.optional(v.array(vSource)),
  warnings: v.optional(v.array(vLanguageModelCallWarning)),
  finishReason: v.optional(vFinishReason),
  providerMetadata: v.optional(vProviderMetadata),
  error: v.optional(v.string()),
  attachments: v.array(vPublicFile),
});

/**
 * Full return validator for the `list` thread query — the enriched page plus
 * pagination markers plus streams. Pinning this breaks a structural
 * inference cycle between scanned convex modules and the `lib/agent-client/`
 * helpers that reference `internal.*` (which is derived from `fullApi`).
 */
export const vListThreadReturn = v.object({
  page: v.array(vEnrichedMessage),
  continueCursor: v.string(),
  isDone: v.boolean(),
  splitCursor: v.optional(v.union(v.string(), v.null())),
  pageStatus: v.optional(
    v.union(
      v.literal("SplitRecommended"),
      v.literal("SplitRequired"),
      v.null(),
    ),
  ),
  streams: vListThreadStreams,
});
