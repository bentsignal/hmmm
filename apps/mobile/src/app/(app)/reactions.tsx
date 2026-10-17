import { useLocalSearchParams } from "expo-router";

import { ReactionsSheet } from "~/features/conversation/reactions-sheet";
import { AccountScope } from "~/features/messaging/account";
import { parsePart } from "~/features/messaging/reactions";

/**
 * The sheet of who reacted to a part of a message, opened from its
 * long-press menu or by holding one of its reactions.
 */
export default function ReactionsScreen() {
  const { account, conversationId, emoji, messageId, part } =
    useLocalSearchParams<{
      account?: string;
      conversationId: string;
      /** The reaction that was held, whose tab the sheet opens on. */
      emoji?: string;
      messageId: string;
      /** The part reacted to (see `ReactionPart`); the message's if absent. */
      part?: string;
    }>();
  return (
    <AccountScope address={account}>
      <ReactionsSheet
        conversationId={conversationId}
        messageId={messageId}
        part={parsePart(part ?? "message")}
        emoji={emoji}
      />
    </AccountScope>
  );
}
