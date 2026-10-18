import { useQueryClient } from "@tanstack/react-query";

import { useAccount, useVisibleAccounts } from "~/features/messaging/account";
import { showSaved, useShowingSaved } from "./saved-cache";
import { conversationFile, inboxFile, readSaved } from "./saved-files";
import {
  CONVERSATION_DEADLINE_MS,
  HOME_DEADLINE_MS,
  useDeadline,
  useSavedFallback,
} from "./use-saved-fallback";

/**
 * Shows each visible account's saved Home (its Inbox and Spaces) if the
 * Inbox is still loading at the deadline, passing `onShow` the queries it
 * filled in.
 */
export function useSavedHome(
  loading: boolean,
  onShow: (filled: readonly string[]) => void,
) {
  const queryClient = useQueryClient();
  const accounts = useVisibleAccounts();
  useDeadline(HOME_DEADLINE_MS, loading, () => {
    onShow(
      accounts.flatMap(({ storagePrefix }) => {
        const saved = readSaved(inboxFile(storagePrefix));
        return saved === undefined ? [] : showSaved(queryClient, saved);
      }),
    );
  });
}

/**
 * A conversation's saved messages, shown if it's still loading at the
 * deadline, and whether it still shows any of them.
 *
 * A conversation opening at its latest messages opens instead at the
 * window they were saved from (`openAt`), if its own pages haven't
 * loaded: the messages since then join below them as they load. One
 * opening at a particular message (its `anchor`) keeps its window and
 * only takes the names, photos, and details it's missing.
 */
export function useSavedConversation(
  conversationId: string,
  window: {
    anchor: string | undefined;
    openAt: (openedAt: number) => void;
    pages: readonly { initial: boolean; messageIds?: readonly string[] }[];
  },
  loading: boolean,
) {
  const queryClient = useQueryClient();
  const { session } = useAccount();
  const filled = useSavedFallback(CONVERSATION_DEADLINE_MS, loading, () => {
    const saved = readSaved(
      conversationFile(session.storagePrefix, conversationId),
    );
    if (saved === undefined) return [];
    const filledIn = showSaved(queryClient, saved);
    const pagesLoaded = window.pages.every(
      (page) => !page.initial || page.messageIds !== undefined,
    );
    if (
      window.anchor === undefined &&
      !pagesLoaded &&
      saved.openedAt !== undefined
    ) {
      window.openAt(saved.openedAt);
    }
    return filledIn;
  });
  return useShowingSaved(filled);
}
