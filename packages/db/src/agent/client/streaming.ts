import { v } from "convex/values";

import type { StreamArgs } from "../validators";
import type { ActionCtx, AgentComponent, MutationCtx, QueryCtx } from "./types";
import {
  vMessageDoc,
  vPaginationResult,
  vStreamDelta,
  vStreamMessage,
} from "../validators";

export const vStreamMessagesReturnValue = v.object({
  ...vPaginationResult(vMessageDoc).fields,
  streams: v.optional(
    v.union(
      v.object({ kind: v.literal("list"), messages: v.array(vStreamMessage) }),
      v.object({ kind: v.literal("deltas"), deltas: v.array(vStreamDelta) }),
    ),
  ),
});

/**
 * A function that handles fetching stream deltas, used with the React hooks
 * `useThreadMessages` or `useStreamingThreadMessages`.
 * @param ctx A ctx object from a query, mutation, or action.
 * @param component The agent component, usually `components.agent`.
 * @param args.threadId The thread to sync streams for.
 * @param args.streamArgs The stream arguments with per-stream cursors.
 * @returns The deltas for each stream from their existing cursor.
 */
export async function syncStreams(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  component: AgentComponent,
  {
    threadId,
    streamArgs,
    includeStatuses,
  }: {
    threadId: string;
    streamArgs?: StreamArgs | undefined;
    // By default, only streaming messages are included.
    includeStatuses?: ("streaming" | "finished" | "aborted")[];
  },
) {
  if (!streamArgs) return undefined;
  if (streamArgs.kind === "list") {
    return {
      kind: "list" as const,
      messages: await listStreams(ctx, component, {
        threadId,
        startOrder: streamArgs.startOrder,
        includeStatuses,
      }),
    };
  }
  return {
    kind: "deltas" as const,
    deltas: await ctx.runQuery(component.streams.listDeltas, {
      threadId,
      cursors: streamArgs.cursors,
    }),
  };
}

export async function abortStream(
  ctx: MutationCtx | ActionCtx,
  component: AgentComponent,
  args: { reason: string } & (
    | { streamId: string }
    | { threadId: string; order: number }
  ),
) {
  if ("streamId" in args) {
    return await ctx.runMutation(component.streams.abort, {
      reason: args.reason,
      streamId: args.streamId,
    });
  }
  return await ctx.runMutation(component.streams.abortByOrder, {
    reason: args.reason,
    threadId: args.threadId,
    order: args.order,
  });
}

/**
 * List the streaming messages for a thread.
 * @param ctx A ctx object from a query, mutation, or action.
 * @param component The agent component, usually `components.agent`.
 * @param args.threadId The thread to list streams for.
 * @param args.startOrder The order of the messages in the thread to start listing from.
 * @param args.includeStatuses The statuses to include in the list.
 * @returns The streams for the thread.
 */
export async function listStreams(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  component: AgentComponent,
  {
    threadId,
    startOrder,
    includeStatuses,
  }: {
    threadId: string;
    startOrder?: number;
    includeStatuses?: ("streaming" | "finished" | "aborted")[];
  },
) {
  return ctx.runQuery(component.streams.list, {
    threadId,
    startOrder,
    statuses: includeStatuses,
  });
}
