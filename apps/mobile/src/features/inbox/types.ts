export type ConversationKind = "direct" | "group" | "channel";

export interface Person {
  id: string;
  displayName: string;
  /** Account address, such as `maya@vera.chat`. */
  address: string;
}

export interface ConversationSummary {
  /** The signed-in account this conversation belongs to. */
  account: string;
  id: string;
  /** Unique across accounts, which can share a conversation. */
  key: string;
  kind: ConversationKind;
  title: string;
  memberIds: string[];
  lastMessage: string;
  /** False until someone sends the first message. */
  hasMessages: boolean;
  lastActivityAt: Date;
  unreadCount: number;
  /** The other person's photo in a direct conversation. */
  avatarUrl: string | null;
  /** Whether the other person in a direct conversation is verified. */
  affiliated: boolean;
  muted: boolean;
  /** When it was pinned to the top of the inbox, or null. */
  pinnedAt: number | null;
  /** The space a channel belongs to. */
  spaceId: string | null;
  spaceName: string | null;
}

/** A thread you follow, as an Inbox row. */
export interface ThreadSummaryRow {
  /** The signed-in account that follows it. */
  account: string;
  conversationId: string;
  /** The conversation's name, as its own row shows it. */
  conversationTitle: string;
  /** Unique across accounts and conversations. */
  key: string;
  /** Its newest reply: "Leo: sounds good". */
  latestReply: string;
  lastActivityAt: Date;
  replyCount: number;
  /** The original message's author: name and photo. */
  rootAuthor: { avatarUrl: string | null; name: string };
  /** The original message's text (or "Photo"). */
  rootText: string;
  threadId: string;
  unreadCount: number;
}

/** One row of the Inbox: a conversation, or a thread you follow. */
export type InboxItem =
  | { kind: "conversation"; conversation: ConversationSummary; key: string }
  | { kind: "thread"; key: string; thread: ThreadSummaryRow };
