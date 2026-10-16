import type { ThreadSummaryRow } from "./types";

/** "1 reply", "4 replies". */
export function replyCountLabel(count: number) {
  return `${count} ${count === 1 ? "reply" : "replies"}`;
}

/** Where tapping a thread's row goes: the thread page. */
export function threadHref(thread: ThreadSummaryRow) {
  return {
    params: {
      account: thread.account,
      conversationId: thread.conversationId,
      threadId: thread.threadId,
      title: thread.conversationTitle,
    },
    pathname: "/thread/[threadId]" as const,
  };
}

/** The conversation a thread is in, opened at its original message. */
export function conversationHref(thread: ThreadSummaryRow) {
  return {
    params: {
      account: thread.account,
      conversationId: thread.conversationId,
      messageId: thread.threadId,
      title: thread.conversationTitle,
    },
    pathname: "/conversation/[conversationId]" as const,
  };
}
