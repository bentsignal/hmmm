import { useRouter } from "expo-router";

import { useAccount } from "~/features/messaging/account";

/** Opens the sheet of who reacted to a message, on one emoji if given. */
export function useReactionsSheet(conversationId: string) {
  const router = useRouter();
  const { address } = useAccount();
  return (messageId: string, emoji?: string) =>
    router.push({
      params: { account: address, conversationId, emoji, messageId },
      pathname: "/reactions",
    });
}
