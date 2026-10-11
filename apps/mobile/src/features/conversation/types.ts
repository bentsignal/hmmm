import type {
  Attachment,
  LinkCard,
  LinkPreview,
} from "@decentralized-convex/messages";

import type { ReactionSummary } from "~/features/messaging/reactions";

export type { Attachment, LinkCard, LinkPreview };

export interface Message {
  id: string;
  authorId: string;
  sentAt: Date;
  body?: string;
  attachments: Attachment[];
  /** The first link's preview, from PDSs that predate `linkPreviews`. */
  linkPreview?: LinkPreview;
  /** A card for each previewed link, in order (see `LinkCard`). */
  linkPreviews?: readonly LinkCard[];
  /** Undefined until the message's reactions have loaded. */
  reactions: readonly ReactionSummary[] | undefined;
  /** Set until the server confirms a message this device sent. */
  status?: "failed" | "sending";
}
