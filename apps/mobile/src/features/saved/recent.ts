import type { Conversation } from "@decentralized-convex/messages";

/** How many of an account's most recent conversations it keeps. */
export const SAVED_CONVERSATIONS = 20;

function lastActivity(conversation: Conversation) {
  return conversation.lastMessage?.sentAt ?? conversation.updatedAt;
}

/** The conversations an account keeps saved: its most recent. */
export function recentConversations(conversations: readonly Conversation[]) {
  return [...conversations]
    .sort((left, right) => lastActivity(right) - lastActivity(left))
    .slice(0, SAVED_CONVERSATIONS);
}

/**
 * What a conversation is as of: when anything it shows last changed, or
 * from a PDS that predates that, when its last message came.
 */
export function versionOf(conversation: Conversation) {
  return conversation.changedAt ?? conversation.updatedAt;
}
