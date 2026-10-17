import type { Reaction } from "@decentralized-convex/messages";
import { useState } from "react";
import { useMutation, useQueries } from "@tanstack/react-query";
import { MAX_REACTION_MESSAGES } from "@decentralized-convex/messages";
import { pdsMutation, pdsQuery } from "@decentralized-convex/tanstack-query";
import { pds } from "@vera/backend/pds";

import { useHeldBatches } from "./held-batches";
import { pdsResultOr } from "./results";

/** The emoji offered first when reacting, in order. */
export const QUICK_REACTIONS = ["❤️", "👍", "👎", "😂", "😮", "😢", "🔥", "🎉"];

/** No reactions, the same array each time so rows don't redraw. */
const NONE = Object.freeze<ReactionSummary[]>([]);

/** One emoji's reactions to a message, as shown under it. */
export interface ReactionSummary {
  readonly emoji: string;
  readonly count: number;
  /** Whether the signed-in account reacted with it. */
  readonly mine: boolean;
  /** Who reacted with it, earliest first. */
  readonly accounts: readonly string[];
}

function chunks(ids: readonly string[]) {
  return Array.from(
    { length: Math.ceil(ids.length / MAX_REACTION_MESSAGES) },
    (_, index) =>
      ids.slice(
        index * MAX_REACTION_MESSAGES,
        (index + 1) * MAX_REACTION_MESSAGES,
      ),
  );
}

function summarize(
  reactions: readonly Reaction[],
  self: string,
  overrides: ReadonlyMap<string, boolean>,
) {
  // Who reacted with what, per message, with this device's pending toggles.
  const byMessage = new Map<string, Map<string, Set<string>>>();
  const earliestFirst = [...reactions].sort(
    (left, right) => left.reactedAt - right.reactedAt,
  );
  for (const { accountId, emoji, messageId } of earliestFirst) {
    const emojis = byMessage.get(messageId) ?? new Map<string, Set<string>>();
    emojis.set(emoji, (emojis.get(emoji) ?? new Set()).add(accountId));
    byMessage.set(messageId, emojis);
  }
  for (const [key, on] of overrides) {
    const [messageId = "", emoji = ""] = key.split(" ");
    const emojis = byMessage.get(messageId) ?? new Map<string, Set<string>>();
    const accounts = emojis.get(emoji) ?? new Set();
    if (on) accounts.add(self);
    else accounts.delete(self);
    emojis.set(emoji, accounts);
    byMessage.set(messageId, emojis);
  }
  return new Map(
    [...byMessage].map(([messageId, emojis]) => [
      messageId,
      [...emojis]
        .filter(([, accounts]) => accounts.size > 0)
        .map(([emoji, accounts]) => ({
          accounts: [...accounts],
          count: accounts.size,
          emoji,
          mine: accounts.has(self),
        })),
    ]),
  );
}

/**
 * Reactions to the loaded messages (one query per page, so paging never
 * refetches what is on screen) and a toggle that shows immediately.
 */
export function useReactions(
  session: string,
  conversationId: string,
  pageMessageIds: readonly (readonly string[])[],
) {
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(
    new Map(),
  );
  const batches = pageMessageIds.flatMap(chunks);
  const held = useHeldBatches();
  function reactionsQuery(messageIds: readonly string[]) {
    return pdsQuery({
      args: { conversationId, messageIds: [...messageIds] },
      options: {
        enabled: messageIds.length > 0,
        // A PDS that can't answer leaves the messages without reactions
        // rather than holding them back.
        select: (result) => pdsResultOr(result, [])?.flat(),
      },
      query: pds.messages.reactions,
      session,
    });
  }
  const { loaded, ownLoaded, reactions } = useQueries({
    queries: batches.map((messageIds) => ({
      ...reactionsQuery(messageIds),
      placeholderData: held.placeholder(messageIds, reactionsQuery),
    })),
    // TanStack shares this structurally with the last result, so a message
    // whose reactions didn't change keeps the same array and its row
    // doesn't redraw.
    combine: (results) => ({
      loaded: batches.flatMap((messageIds, index) =>
        results[index]?.data === undefined ? [] : messageIds,
      ),
      ownLoaded: batches.filter(
        (_, index) =>
          results[index]?.data !== undefined &&
          !results[index].isPlaceholderData,
      ),
      reactions: Object.fromEntries(
        summarize(
          results.flatMap((result) => result.data ?? []),
          session,
          overrides,
        ),
      ),
    }),
  });
  held.remember(ownLoaded);
  const react = useMutation(
    pdsMutation({ mutation: pds.messages.react, session }),
  );

  function setOverride(key: string, on: boolean | undefined) {
    setOverrides((current) => {
      const next = new Map(current);
      if (on === undefined) next.delete(key);
      else next.set(key, on);
      return next;
    });
  }

  const loadedIds = new Set(loaded);

  return {
    /** A message's reactions, or undefined while they are still loading. */
    reactionsOf: (messageId: string) =>
      loadedIds.has(messageId) ? (reactions[messageId] ?? NONE) : undefined,
    toggle: (messageId: string, emoji: string) => {
      const on = !(
        reactions[messageId]?.some(
          (item) => item.emoji === emoji && item.mine,
        ) ?? false
      );
      const key = `${messageId} ${emoji}`;
      setOverride(key, on);
      react.mutate(
        { conversationId, emoji, messageId, on },
        // The live query has the result by now; drop the stand-in.
        { onSettled: () => setOverride(key, undefined) },
      );
    },
  };
}
