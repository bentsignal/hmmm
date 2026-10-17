import { useRouter } from "expo-router";

import type { ReactionPart } from "~/features/messaging/reactions";
import { useAccount } from "~/features/messaging/account";

/** Opens the sheet of who reacted to a part, on one emoji if given. */
export function useReactionsSheet(conversationId: string) {
  const router = useRouter();
  const { address } = useAccount();
  return (messageId: string, part: ReactionPart, emoji?: string) =>
    router.push({
      params: {
        account: address,
        conversationId,
        emoji,
        messageId,
        part: String(part),
      },
      pathname: "/reactions",
    });
}
