import { Data } from "effect";

import { ErrorCode } from "./error_codes";

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

export function errorCodeFor(
  e:
    | StreamInitError
    | StreamConsumeError
    | FollowUpGenerationError
    | ConvexCallError,
) {
  switch (e._tag) {
    case "StreamInitError":
      return ErrorCode.StreamInitFailed;
    case "StreamConsumeError":
      return ErrorCode.StreamConsumeFailed;
    case "FollowUpGenerationError":
      return ErrorCode.FollowUpsFailed;
    case "ConvexCallError":
      return ErrorCode.ConvexCallFailed;
  }
}
