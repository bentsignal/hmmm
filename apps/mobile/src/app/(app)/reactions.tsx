import { useLocalSearchParams } from "expo-router";

import { ReactionsSheet } from "~/features/conversation/reactions-sheet";
import { AccountScope } from "~/features/messaging/account";

/**
 * The sheet of who reacted to a message, opened from its long-press menu or
 * by holding one of its reactions.
 */
export default function ReactionsScreen() {
  const { account, conversationId, emoji, messageId } = useLocalSearchParams<{
    account?: string;
    conversationId: string;
    /** The reaction that was held, whose tab the sheet opens on. */
    emoji?: string;
    messageId: string;
  }>();
  return (
    <AccountScope address={account}>
      <ReactionsSheet
        conversationId={conversationId}
        messageId={messageId}
        emoji={emoji}
      />
    </AccountScope>
  );
}
