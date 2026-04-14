"use client";

import { useEffect, useMemo, useState } from "react";
import { type UIDataTypes, type UIMessageChunk, type UITools } from "ai";

import {
  blankUIMessage,
  deriveUIMessagesFromTextStreamParts,
  getParts,
  updateFromUIMessageChunks,
} from "@acme/db/agent/deltas";
import { type UIMessage } from "@acme/db/agent/UIMessages";

import type { StreamQuery, StreamQueryArgs } from "./types";
import { useDeltaStreams } from "./useDeltaStreams";

// The original `@convex-dev/agent/react` package polyfilled `structuredClone`
// here for React Native. The web + xr apps both target browsers that ship
// `structuredClone` natively (Safari 15.4+, Chrome 98+, Firefox 94+), so the
// polyfill — and its `@ungap/structured-clone` dep — has been dropped.

/**
 * A hook that fetches streaming messages from a thread and converts them to UIMessages
 * using AI SDK's readUIMessageStream.
 * This ONLY returns streaming UIMessages. To get both full and streaming messages,
 * use `useUIMessages`.
 *
 * @param query The query to use to fetch messages.
 * It must take as arguments `{ threadId, paginationOpts, streamArgs }` and
 * return a `streams` object returned from `agent.syncStreams`.
 * @param args The arguments to pass to the query other than `paginationOpts`
 * and `streamArgs`. So `{ threadId }` at minimum, plus any other arguments that
 * you want to pass to the query.
 * @returns The streaming UIMessages.
 */
export function useStreamingUIMessages<
  METADATA = unknown,
  DATA_PARTS extends UIDataTypes = UIDataTypes,
  TOOLS extends UITools = UITools,
  Query extends StreamQuery<any> = StreamQuery<object>,
>(
  query: Query,
  args: StreamQueryArgs<Query> | "skip",
  options?: {
    startOrder?: number;
    skipStreamIds?: string[];
  },
  // TODO: make generic on metadata, etc.
): UIMessage<METADATA, DATA_PARTS, TOOLS>[] | undefined {
  const [messageState, setMessageState] = useState<
    Record<
      string,
      {
        uiMessage: UIMessage<METADATA, DATA_PARTS, TOOLS>;
        cursor: number;
      }
    >
  >({});

  const streams = useDeltaStreams(query, args, options);

  const threadId = args === "skip" ? undefined : args.threadId;

  useEffect(() => {
    if (!streams) return;
    // return if there are no new deltas beyond the cursors
    let noNewDeltas = true;
    for (const stream of streams) {
      const lastDelta = stream.deltas.at(-1);
      const cursor = messageState[stream.streamMessage.streamId]?.cursor;
      if (!cursor) {
        noNewDeltas = false;
        break;
      }
      if (lastDelta && lastDelta.start >= cursor) {
        noNewDeltas = false;
        break;
      }
    }
    if (noNewDeltas) {
      return;
    }
    const abortController = new AbortController();
    void (async () => {
      const newMessageState: Record<
        string,
        {
          uiMessage: UIMessage<METADATA, DATA_PARTS, TOOLS>;
          cursor: number;
        }
      > = Object.fromEntries(
        await Promise.all(
          streams.map(async ({ deltas, streamMessage }) => {
            const { parts, cursor } = getParts<UIMessageChunk>(deltas, 0);
            if (streamMessage.format === "UIMessageChunk") {
              // Unfortunately this can't handle resuming from a UIMessage and
              // adding more chunks, so we re-create it from scratch each time.
              const uiMessage = await updateFromUIMessageChunks(
                blankUIMessage(streamMessage, threadId),
                parts,
              );
              return [
                streamMessage.streamId,
                {
                  uiMessage,
                  cursor,
                },
              ];
            } else {
              const [uiMessages] = deriveUIMessagesFromTextStreamParts(
                threadId,
                [streamMessage],
                [],
                deltas,
              );
              return [
                streamMessage.streamId,
                {
                  uiMessage: uiMessages[0],
                  cursor,
                },
              ];
            }
          }),
        ),
      );
      if (abortController.signal.aborted) return;
      setMessageState(newMessageState);
    })();
    return () => {
      abortController.abort();
    };
  }, [messageState, streams, threadId]);

  return useMemo(() => {
    if (!streams) return undefined;
    return streams
      .map(
        ({ streamMessage }) => messageState[streamMessage.streamId]?.uiMessage,
      )
      .filter((uiMessage) => uiMessage !== undefined);
  }, [messageState, streams]);
}
