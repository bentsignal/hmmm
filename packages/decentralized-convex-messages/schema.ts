import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  attachment,
  conversationKind,
  linkCard,
  linkPreview,
  spaceRole,
} from "./protocol.ts";

export default defineSchema({
  conversations: defineTable({
    conversationId: v.string(),
    createdBy: v.string(),
    kind: conversationKind,
    name: v.optional(v.string()),
    position: v.optional(v.number()),
    spaceId: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_space", ["spaceId"]),
  // Direct and group members, plus per-account read state and settings for
  // channels.
  members: defineTable({
    accountId: v.string(),
    conversationId: v.string(),
    // A channel left out of the inbox; it still appears in its space.
    hiddenFromInbox: v.optional(v.boolean()),
    lastReadAt: v.number(),
    muted: v.boolean(),
    // When the account pinned the conversation to the top of its inbox.
    pinnedAt: v.optional(v.number()),
    role: spaceRole,
  })
    .index("by_account", ["accountId"])
    .index("by_conversation_account", ["conversationId", "accountId"]),
  messages: defineTable({
    attachments: v.array(attachment),
    authorId: v.string(),
    authorName: v.string(),
    body: v.string(),
    conversationId: v.string(),
    linkPreview: v.optional(linkPreview),
    linkPreviews: v.optional(v.array(linkCard)),
    messageId: v.string(),
    sentAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_conversation_sent", ["conversationId", "sentAt"]),
  // Link previews fetched recently, shared by everyone on this PDS, so a
  // link prefetched while typing is ready when the message is sent.
  linkPreviewCache: defineTable({
    // Deleted once this passes; a fetch that never finished is retried.
    expiresAt: v.number(),
    // Set once fetched; null when the link had no preview.
    preview: v.optional(v.union(v.null(), linkPreview)),
    url: v.string(),
  }).index("by_url", ["url"]),
  // Messages whose card for `url` waits on a fetch in flight.
  linkPreviewWaits: defineTable({
    messageId: v.string(),
    url: v.string(),
  })
    .index("by_url", ["url"])
    .index("by_message", ["messageId"]),
  // Reactions by this PDS's accounts, to messages stored on any PDS.
  reactions: defineTable({
    accountId: v.string(),
    conversationId: v.string(),
    emoji: v.string(),
    messageId: v.string(),
    // Who wrote the message, when it's stored here too, so its author's
    // activity can list reactions to it.
    messageAuthorId: v.optional(v.string()),
    reactedAt: v.number(),
  })
    .index("by_message", ["messageId"])
    .index("by_message_account", ["messageId", "accountId"])
    .index("by_author_reacted", ["messageAuthorId", "reactedAt"]),
  // Each time an account saw an activity item (`key`) on screen, through
  // the newest activity in it then. Only the newest sighting older than a
  // day matters, so older ones are deleted.
  activitySightings: defineTable({
    accountId: v.string(),
    key: v.string(),
    seenAt: v.number(),
    through: v.number(),
  })
    .index("by_account_key", ["accountId", "key", "seenAt"])
    .index("by_account_seen", ["accountId", "seenAt"]),
  spaces: defineTable({
    createdBy: v.string(),
    name: v.string(),
    spaceId: v.string(),
  }).index("by_space", ["spaceId"]),
  spaceMembers: defineTable({
    accountId: v.string(),
    // Alerts hidden for every channel in the space.
    muted: v.optional(v.boolean()),
    role: spaceRole,
    spaceId: v.string(),
  })
    .index("by_account", ["accountId"])
    .index("by_space_account", ["spaceId", "accountId"]),
  // People invited to a space who haven't accepted or declined yet.
  spaceInvites: defineTable({
    accountId: v.string(),
    invitedBy: v.string(),
    spaceId: v.string(),
  })
    .index("by_account", ["accountId"])
    .index("by_space_account", ["spaceId", "accountId"]),
  // Links into a space; `expiresAt` is absent on ones that never expire.
  spaceInviteLinks: defineTable({
    code: v.string(),
    createdBy: v.string(),
    expiresAt: v.optional(v.number()),
    spaceId: v.string(),
  })
    .index("by_code", ["code"])
    .index("by_space", ["spaceId"]),
  // Kinds of pushes an account turned off; absent fields are on.
  notificationSettings: defineTable({
    accountId: v.string(),
    channels: v.optional(v.boolean()),
    directMessages: v.optional(v.boolean()),
    enabled: v.optional(v.boolean()),
    groups: v.optional(v.boolean()),
    invites: v.optional(v.boolean()),
    reactions: v.optional(v.boolean()),
  }).index("by_account", ["accountId"]),
  pushTokens: defineTable({
    accountId: v.string(),
    token: v.string(),
  })
    .index("by_account", ["accountId"])
    .index("by_token", ["token"]),
});
