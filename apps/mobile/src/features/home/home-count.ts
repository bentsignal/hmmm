import type {
  Conversation,
  InboxKind,
  InboxThread,
} from "@decentralized-convex/messages";

/**
 * Whether a conversation is one the Inbox lists with these kinds ticked,
 * and alerts about its every message, so its unread messages badge Home.
 * One at Mentions or muted keeps its unread dot without counting; its
 * mentions and replies to you are in Activity.
 */
function countsConversation(
  conversation: Pick<Conversation, "alerts" | "kind" | "muted">,
  kinds: readonly InboxKind[],
) {
  const kind = conversation.kind === "channel" ? "channels" : "chats";
  // Servers from before alert levels only say whether it's muted.
  const alerts = conversation.alerts ?? (conversation.muted ? "none" : "all");
  return kinds.includes(kind) && alerts === "all";
}

/**
 * Home's badge: the Inbox rows of the kinds it lists that have something
 * unread, whether it shows all of them or only unread ones. A row counts
 * once however much it holds, as Activity's rows do.
 */
export function homeCount({
  conversations,
  kinds,
  threads,
}: {
  conversations: readonly Pick<
    Conversation,
    "alerts" | "kind" | "muted" | "unreadCount"
  >[];
  kinds: readonly InboxKind[];
  threads: readonly Pick<InboxThread, "unreadCount">[];
}) {
  const chats = conversations.filter(
    (conversation) =>
      conversation.unreadCount > 0 && countsConversation(conversation, kinds),
  ).length;
  const replies = kinds.includes("threads")
    ? threads.filter((thread) => thread.unreadCount > 0).length
    : 0;
  return chats + replies;
}
