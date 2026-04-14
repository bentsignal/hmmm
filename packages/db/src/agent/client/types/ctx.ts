import type {
  FunctionReference,
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  PaginationResult,
} from "convex/server";

import type {
  MessageDoc,
  StreamDelta,
  StreamMessage,
  ThreadDoc,
} from "../../validators";

export type QueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;
export type MutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runQuery" | "runMutation"
>;
export type ActionCtx = Pick<
  GenericActionCtx<GenericDataModel>,
  "runQuery" | "runMutation" | "runAction" | "storage" | "auth"
>;

// AgentComponent is built at runtime from the host app's `internal.agent`
// namespace. We type each field as a `FunctionReference` so that calls through
// `runQuery` / `runMutation` / `runAction` get back a strongly-typed Promise.
// Args are left permissive (`any`) so call sites don't have to enumerate every
// generated argument shape; returns are typed concretely so downstream code
// doesn't have to handle `any`.
type AgentFn<
  T extends "query" | "mutation" | "action",
  Returns,
> = FunctionReference<
  T,
  "internal" | "public",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- args are pass-through; concrete return types live on the right
  any,
  Returns
>;

export interface AgentComponent {
  threads: {
    createThread: AgentFn<"mutation", ThreadDoc>;
    getThread: AgentFn<"query", ThreadDoc | null>;
    updateThread: AgentFn<"mutation", ThreadDoc>;
    searchThreadTitles: AgentFn<"query", ThreadDoc[]>;
    deleteAllForThreadIdAsync: AgentFn<"mutation", void>;
    deleteAllForThreadIdSync: AgentFn<"action", void>;
  };
  messages: {
    addMessages: AgentFn<"mutation", { messages: MessageDoc[] }>;
    listMessagesByThreadId: AgentFn<"query", PaginationResult<MessageDoc>>;
    finalizeMessage: AgentFn<"mutation", void>;
    updateMessage: AgentFn<"mutation", void>;
    deleteByIds: AgentFn<"mutation", void>;
    deleteByOrder: AgentFn<"mutation", void>;
  };
  streams: {
    create: AgentFn<"mutation", string>;
    addDelta: AgentFn<"mutation", boolean>;
    finish: AgentFn<"mutation", void>;
    abort: AgentFn<"mutation", boolean>;
    abortByOrder: AgentFn<"mutation", boolean>;
    list: AgentFn<"query", StreamMessage[]>;
    listDeltas: AgentFn<"query", StreamDelta[]>;
  };
}

export type SyncStreamsReturnValue =
  | { kind: "list"; messages: StreamMessage[] }
  | { kind: "deltas"; deltas: StreamDelta[] }
  | undefined;
