import type { ConversationSummary, InboxItem, ThreadSummaryRow } from "./types";
import type { InboxKind } from "~/features/preferences/inbox-kinds";
import type { InboxShow } from "~/features/preferences/store";

function keepsConversation(
  conversation: ConversationSummary,
  show: InboxShow,
  kinds: readonly InboxKind[],
) {
  // A conversation joins the Inbox with its first message, so nobody sees
  // an empty chat someone opened with them but never wrote in.
  if (!conversation.hasMessages) return false;
  if (show === "unread" && conversation.unreadCount === 0) return false;
  return kinds.includes(conversation.kind === "channel" ? "channels" : "chats");
}

function conversationItem(conversation: ConversationSummary) {
  return {
    conversation,
    key: conversation.key,
    kind: "conversation",
  } satisfies InboxItem;
}

function lastActivity(item: InboxItem) {
  return item.kind === "conversation"
    ? item.conversation.lastActivityAt.getTime()
    : item.thread.lastActivityAt.getTime();
}

/**
 * The rows the Inbox lists, of the kinds ticked: pinned conversations
 * first, in the order they were pinned, then the rest, conversations and
 * threads together, newest first. Unread shows only conversations with
 * unread messages and threads with unread replies.
 */
export function filterInbox({
  conversations,
  threads,
  show,
  kinds,
}: {
  conversations: readonly ConversationSummary[];
  threads: readonly ThreadSummaryRow[];
  show: InboxShow;
  kinds: readonly InboxKind[];
}) {
  const kept = conversations.filter((conversation) =>
    keepsConversation(conversation, show, kinds),
  );
  const pinned = kept
    .filter((conversation) => conversation.pinnedAt !== null)
    .sort((left, right) => (left.pinnedAt ?? 0) - (right.pinnedAt ?? 0));
  const shownThreads = kinds.includes("threads")
    ? threads.filter((thread) => show === "all" || thread.unreadCount > 0)
    : [];
  const rest = [
    ...kept
      .filter((conversation) => conversation.pinnedAt === null)
      .map(conversationItem),
    ...shownThreads.map(
      (thread) =>
        ({ key: thread.key, kind: "thread", thread }) satisfies InboxItem,
    ),
  ].sort((left, right) => lastActivity(right) - lastActivity(left));
  return { pinned: pinned.map(conversationItem), rest };
}
