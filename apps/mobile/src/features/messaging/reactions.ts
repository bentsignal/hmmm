import type { Reaction } from "@decentralized-convex/messages";
import { useState } from "react";
import { useMutation, useQueries } from "@tanstack/react-query";
import { MAX_REACTION_MESSAGES } from "@decentralized-convex/messages";
import { pdsMutation, pdsQuery } from "@decentralized-convex/tanstack-query";
import { pds } from "@vera/backend/pds";

import { pdsResultOr } from "./results";

/** The emoji offered first when reacting, in order. */
export const QUICK_REACTIONS = ["❤️", "👍", "👎", "😂", "😮", "😢", "🔥", "🎉"];

/** No reactions, the same array each time so rows don't redraw. */
const NONE = Object.freeze<ReactionSummary[]>([]);

/**
 * Which part of a message a reaction is on: one of its attachments, by
 * index, or `message`, the message itself (its text, or its first
 * attachment when it has no text; see `reaction` in the protocol).
 */
export type ReactionPart = number | "message";

/**
 * The part a message's attachment is: the first of a message without text
 * is the message itself, so a reaction to it is one older apps show too.
 */
export function attachmentPart(
  message: { readonly body?: string },
  index: number,
) {
  return index === 0 && message.body === undefined
    ? ("message" as const)
    : index;
}

/** How many parts of a message take reactions: its attachments and text. */
export function partCount(message: {
  readonly attachments: readonly unknown[];
  readonly body?: string;
}) {
  return message.attachments.length + (message.body === undefined ? 0 : 1);
}

/** The reactions on one part of a message. */
export function reactionsOn(
  reactions: readonly ReactionSummary[] | undefined,
  part: ReactionPart,
) {
  return (reactions ?? NONE).filter((reaction) => reaction.part === part);
}

/** One emoji's reactions to a part of a message, as shown on it. */
export interface ReactionSummary {
  readonly part: ReactionPart;
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

/** A reaction's part, as a protocol `attachment` reads. */
function partOf(attachment: number | undefined) {
  return attachment ?? ("message" as const);
}

/** A pending toggle's key: the message, the part, and the emoji. */
function overrideKey(messageId: string, part: ReactionPart, emoji: string) {
  return `${messageId} ${part} ${emoji}`;
}

function parseOverrideKey(key: string) {
  const [messageId = "", part = "", emoji = ""] = key.split(" ");
  return {
    emoji,
    messageId,
    part: part === "message" ? ("message" as const) : Number(part),
  };
}

/** The key of one emoji on one part, unique within a message. */
function emojiKey(part: ReactionPart, emoji: string) {
  return `${part} ${emoji}`;
}

interface Tally {
  readonly part: ReactionPart;
  readonly emoji: string;
  readonly accounts: Set<string>;
}

function summarize(
  reactions: readonly Reaction[],
  self: string,
  overrides: ReadonlyMap<string, boolean>,
) {
  // Who reacted with what on each part, per message, with this device's
  // pending toggles.
  const byMessage = new Map<string, Map<string, Tally>>();
  function tally(messageId: string, part: ReactionPart, emoji: string) {
    const emojis = byMessage.get(messageId) ?? new Map<string, Tally>();
    byMessage.set(messageId, emojis);
    const key = emojiKey(part, emoji);
    const found = emojis.get(key) ?? { accounts: new Set(), emoji, part };
    emojis.set(key, found);
    return found.accounts;
  }
  const earliestFirst = [...reactions].sort(
    (left, right) => left.reactedAt - right.reactedAt,
  );
  for (const { accountId, attachment, emoji, messageId } of earliestFirst) {
    tally(messageId, partOf(attachment), emoji).add(accountId);
  }
  for (const [key, on] of overrides) {
    const { emoji, messageId, part } = parseOverrideKey(key);
    const accounts = tally(messageId, part, emoji);
    if (on) accounts.add(self);
    else accounts.delete(self);
  }
  return new Map(
    [...byMessage].map(([messageId, emojis]) => [
      messageId,
      [...emojis.values()]
        .filter(({ accounts }) => accounts.size > 0)
        .map(
          ({ accounts, emoji, part }) =>
            ({
              accounts: [...accounts],
              count: accounts.size,
              emoji,
              mine: accounts.has(self),
              part,
            }) satisfies ReactionSummary,
        ),
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
  const { loaded, reactions } = useQueries({
    queries: batches.map((messageIds) =>
      pdsQuery({
        args: { conversationId, messageIds },
        options: {
          enabled: messageIds.length > 0,
          // A PDS that can't answer leaves the messages without reactions
          // rather than holding them back.
          select: (result) => pdsResultOr(result, [])?.flat(),
        },
        query: pds.messages.reactions,
        session,
      }),
    ),
    // TanStack shares this structurally with the last result, so a message
    // whose reactions didn't change keeps the same array and its row
    // doesn't redraw.
    combine: (results) => ({
      loaded: batches.flatMap((messageIds, index) =>
        results[index]?.data === undefined ? [] : messageIds,
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
    toggle: (messageId: string, emoji: string, part: ReactionPart) => {
      const on = !(
        reactions[messageId]?.some(
          (item) => item.part === part && item.emoji === emoji && item.mine,
        ) ?? false
      );
      const key = overrideKey(messageId, part, emoji);
      setOverride(key, on);
      react.mutate(
        {
          attachment: part === "message" ? undefined : part,
          conversationId,
          emoji,
          messageId,
          on,
        },
        // The live query has the result by now; drop the stand-in.
        { onSettled: () => setOverride(key, undefined) },
      );
    },
  };
}
