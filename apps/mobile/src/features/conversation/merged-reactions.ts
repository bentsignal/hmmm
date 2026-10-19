import type {
  ReactionPart,
  ReactionSummary,
} from "~/features/messaging/reactions";

/**
 * The reactions on several parts as one, per emoji: everyone who reacted
 * with it on any of them, once each. What a stack of photos shows for all
 * of them.
 */
export function mergedReactions(
  reactions: readonly ReactionSummary[] | undefined,
  parts: readonly ReactionPart[],
) {
  const byEmoji = new Map<string, ReactionSummary[]>();
  for (const reaction of reactions ?? []) {
    if (parts.includes(reaction.part)) {
      byEmoji.set(reaction.emoji, [
        ...(byEmoji.get(reaction.emoji) ?? []),
        reaction,
      ]);
    }
  }
  return [...byEmoji].map(([emoji, same]) => {
    const accounts = [
      ...new Set(same.flatMap((reaction) => reaction.accounts)),
    ];
    return {
      accounts,
      count: accounts.length,
      emoji,
      mine: same.some((reaction) => reaction.mine),
      part: same[0]?.part ?? "message",
    } satisfies ReactionSummary;
  });
}
