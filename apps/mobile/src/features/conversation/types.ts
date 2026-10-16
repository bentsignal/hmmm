import type {
  Attachment,
  LinkCard,
  LinkPreview,
  Quote,
} from "@decentralized-convex/messages";

import type { ReactionSummary } from "~/features/messaging/reactions";

export type { Attachment, LinkCard, LinkPreview, Quote };

/** A message's thread, as far as the conversation shows it. */
export interface ThreadInfo {
  /** Every reply in it, the one shown in the conversation included. */
  readonly replyCount: number;
  /** Who wrote the replies, newest first. */
  readonly repliers: readonly string[];
}

/** Where an attachment of a message this device is sending stands. */
export interface AttachmentUpload {
  readonly messageId: string;
  readonly itemId: string;
  readonly state: "failed" | "too-large" | "uploaded" | "uploading";
}

/** An attachment as the conversation shows it. */
export interface MessageAttachment extends Attachment {
  /** This device's copy of something it sent, shown instead of the upload. */
  readonly localUrl?: string;
  /** This device's poster frame for a video it sent. */
  readonly localThumbnailUrl?: string;
  /** Set while a message this device sent hasn't been confirmed. */
  readonly upload?: AttachmentUpload;
}

export interface Message {
  id: string;
  authorId: string;
  sentAt: Date;
  body?: string;
  attachments: readonly MessageAttachment[];
  /** The first link's preview, from PDSs that predate `linkPreviews`. */
  linkPreview?: LinkPreview;
  /** A card for each previewed link, in order (see `LinkCard`). */
  linkPreviews?: readonly LinkCard[];
  /** Undefined until the message's reactions have loaded. */
  reactions: readonly ReactionSummary[] | undefined;
  /** Set until the server confirms a message this device sent. */
  status?: "failed" | "sending";
  /** A reply's thread: the ID of the message it answers. */
  threadId?: string;
  /**
   * What a reply shown in the conversation quotes of the message it
   * answers (its reply card). Left off in the thread itself.
   */
  quote?: Quote;
  /** The message's thread, or a reply card's, once it has replies. */
  thread?: ThreadInfo;
}

/** Someone joining or leaving a group, shown between its messages. */
export interface MemberNotice {
  readonly id: string;
  readonly kind: "joined" | "left";
  readonly accountId: string;
  /** Their display name, as the notice shows it. */
  readonly name: string;
  readonly at: Date;
}
