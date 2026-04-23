import { Data } from "effect";

import type { SystemErrorCode } from "../thread/helpers";

export class EarlyAborted extends Data.TaggedError("EarlyAborted") {}

export class UserAborted extends Data.TaggedError("UserAborted") {}

export class StreamInitError extends Data.TaggedError("StreamInitError")<{
  readonly cause: unknown;
  readonly model: string;
}> {}

export class StreamConsumeError extends Data.TaggedError("StreamConsumeError")<{
  readonly cause: unknown;
}> {}

export class FollowUpGenerationError extends Data.TaggedError(
  "FollowUpGenerationError",
)<{
  readonly cause: unknown;
}> {}

// Raised whenever a Convex query/mutation invoked from within the Effect
// program rejects. `op` identifies the call site for logging (e.g.
// "wasAborted", "events.emit") so we can triage without relying on the
// underlying error message.
export class ConvexCallError extends Data.TaggedError("ConvexCallError")<{
  readonly cause: unknown;
  readonly op: string;
}> {}

export class GenerateResponseError extends Data.TaggedError(
  "GenerateResponseError",
)<{
  readonly cause: unknown;
  readonly phase: "createThread" | "generateText";
}> {}

export type StreamResponseError =
  | StreamInitError
  | StreamConsumeError
  | FollowUpGenerationError
  | ConvexCallError;

// Maps tagged errors to legacy system error codes so the existing client
// rendering pipeline in @acme/features (which parses `--SYSTEM_ERROR--G1` etc.)
// keeps working. Client-side code is intentionally out of scope here.
export function systemErrorCodeFor(e: StreamInitError | StreamConsumeError) {
  return e._tag === "StreamInitError"
    ? ("G1" satisfies SystemErrorCode)
    : ("G2" satisfies SystemErrorCode);
}
