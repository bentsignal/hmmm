import { DECENTRALIZED_CONVEX_VERSION } from "@decentralized-convex/core";
import {
  defineOperation,
  definePluginProtocol,
} from "@decentralized-convex/plugin";
import { v } from "convex/values";

import { decentralizedConvexPackage } from "./metadata.ts";
import {
  activityItem,
  activitySighting,
  alertLevel,
  attachment,
  conversation,
  linkCard,
  mention,
  message,
  messagePage,
  notificationSettings,
  reaction,
  space,
  spaceInvite,
  spaceInviteLink,
  spaceInviteLinkPreview,
} from "./shapes.ts";

export * from "./shapes.ts";

export const messagesProtocol = definePluginProtocol({
  lastChanged: decentralizedConvexPackage.lastChanged,
  name: "messages",
  mutations: {
    /** Opens (or returns) the one-to-one conversation with an address. */
    openDirect: defineOperation({
      args: v.object({ accountId: v.string() }),
      returns: v.object({ conversationId: v.string() }),
    }),
    /** Unnamed groups show their members; app-made IDs: see `createdId`. */
    createGroup: defineOperation({
      args: v.object({
        conversationId: v.optional(v.string()),
        members: v.array(v.string()),
        name: v.optional(v.string()),
      }),
      returns: v.object({ conversationId: v.string() }),
    }),
    renameGroup: defineOperation({
      args: v.object({ conversationId: v.string(), name: v.string() }),
      returns: v.null(),
    }),
    addGroupMembers: defineOperation({
      args: v.object({
        conversationId: v.string(),
        members: v.array(v.string()),
      }),
      returns: v.null(),
    }),
    leaveConversation: defineOperation({
      args: v.object({ conversationId: v.string() }),
      returns: v.null(),
    }),
    /**
     * `mentions` names who the body @mentions, each by the name after its
     * `@`. Any that isn't a member of the group or channel, or whose
     * `@name` isn't in the body, is left out; direct messages have none.
     */
    send: defineOperation({
      args: v.object({
        attachments: v.array(attachment),
        body: v.string(),
        conversationId: v.string(),
        mentions: v.optional(v.array(mention)),
        messageId: v.string(),
      }),
      returns: message,
    }),
    /**
     * Starts fetching previews of links being typed, so they're ready when
     * the message is sent. Read them with `linkPreviews`.
     */
    prefetchLinkPreviews: defineOperation({
      args: v.object({ urls: v.array(v.string()) }),
      returns: v.null(),
    }),
    /**
     * Adds (`on: true`) or removes your emoji reaction to a message. The
     * reaction is stored on your home PDS, like the messages you send.
     */
    react: defineOperation({
      args: v.object({
        conversationId: v.string(),
        emoji: v.string(),
        messageId: v.string(),
        on: v.boolean(),
      }),
      returns: v.null(),
    }),
    /**
     * Records that activity items came into view (see `activity`). Each
     * stays for `ACTIVITY_SEEN_LIFETIME` after it's seen, then goes, until
     * something newer happens in it.
     */
    markActivitySeen: defineOperation({
      args: v.object({ items: v.array(activitySighting) }),
      returns: v.null(),
    }),
    markRead: defineOperation({
      args: v.object({ conversationId: v.string(), readAt: v.number() }),
      returns: v.null(),
    }),
    /** `setAlerts` with `none` (muted) or `all`, for older apps. */
    setMuted: defineOperation({
      args: v.object({ conversationId: v.string(), muted: v.boolean() }),
      returns: v.null(),
    }),
    /**
     * Chooses what a conversation alerts you about. A channel's choice
     * wins over its space's, and a space's or group's over your defaults
     * (`groupAlerts`, `channelAlerts`); choosing what it would get anyway
     * follows those again. Direct messages take `all` or `none`.
     */
    setAlerts: defineOperation({
      args: v.object({ alerts: alertLevel, conversationId: v.string() }),
      returns: v.null(),
    }),
    /** `setSpaceAlerts` with `none` (muted) or `all`, for older apps. */
    setSpaceMuted: defineOperation({
      args: v.object({ muted: v.boolean(), spaceId: v.string() }),
      returns: v.null(),
    }),
    /**
     * Chooses what a space's channels alert you about, except those with
     * their own choice (see `setAlerts`).
     */
    setSpaceAlerts: defineOperation({
      args: v.object({ alerts: alertLevel, spaceId: v.string() }),
      returns: v.null(),
    }),
    /**
     * Turns kinds of pushes on or off and sets the default alerts for
     * groups and channels; fields left out stay as they are. `groups` or
     * `channels` (from older apps) sets that default to `all` or `none`.
     */
    setNotificationSettings: defineOperation({
      args: v.object({
        channelAlerts: v.optional(alertLevel),
        channels: v.optional(v.boolean()),
        directMessages: v.optional(v.boolean()),
        enabled: v.optional(v.boolean()),
        groupAlerts: v.optional(alertLevel),
        groups: v.optional(v.boolean()),
        invites: v.optional(v.boolean()),
        reactions: v.optional(v.boolean()),
      }),
      returns: v.null(),
    }),
    /** Pins a conversation to the top of your inbox, or unpins it. */
    setPinned: defineOperation({
      args: v.object({ conversationId: v.string(), pinned: v.boolean() }),
      returns: v.null(),
    }),
    /**
     * Lists a channel in your inbox (the default) or leaves it out; it
     * stays in its space either way. Channels only.
     */
    setShowInInbox: defineOperation({
      args: v.object({ conversationId: v.string(), show: v.boolean() }),
      returns: v.null(),
    }),
    /** A space with a #general channel; app-made IDs: see `createdId`. */
    createSpace: defineOperation({
      args: v.object({
        generalChannelId: v.optional(v.string()),
        name: v.string(),
        spaceId: v.optional(v.string()),
      }),
      returns: v.object({ spaceId: v.string() }),
    }),
    renameSpace: defineOperation({
      args: v.object({ name: v.string(), spaceId: v.string() }),
      returns: v.null(),
    }),
    /**
     * Adds people to a space without asking them. Apps from before
     * invitations call it; newer ones call `inviteToSpace`.
     */
    addSpaceMembers: defineOperation({
      args: v.object({ members: v.array(v.string()), spaceId: v.string() }),
      returns: v.null(),
    }),
    /** Invites people, who join when they accept. Any member may invite. */
    inviteToSpace: defineOperation({
      args: v.object({ members: v.array(v.string()), spaceId: v.string() }),
      returns: v.null(),
    }),
    acceptSpaceInvite: defineOperation({
      args: v.object({ spaceId: v.string() }),
      returns: v.null(),
    }),
    declineSpaceInvite: defineOperation({
      args: v.object({ spaceId: v.string() }),
      returns: v.null(),
    }),
    /**
     * Makes a link into a space that lasts `expiresIn` milliseconds, or
     * forever without it. Any member may make one.
     */
    createSpaceInviteLink: defineOperation({
      args: v.object({
        expiresIn: v.optional(v.number()),
        spaceId: v.string(),
      }),
      returns: spaceInviteLink,
    }),
    /**
     * Changes how long a link lasts: `expiresIn` milliseconds from when it
     * was made, or forever without it. Its maker or a space owner may. A
     * lifetime that has already run out fails with `INVALID_EXPIRATION`.
     */
    setSpaceInviteLinkExpiry: defineOperation({
      args: v.object({
        code: v.string(),
        expiresIn: v.optional(v.number()),
      }),
      returns: spaceInviteLink,
    }),
    /** Deletes a link. Its maker or a space owner may. */
    revokeSpaceInviteLink: defineOperation({
      args: v.object({ code: v.string() }),
      returns: v.null(),
    }),
    /** Joins the space a link leads to (a member already stays one). */
    joinSpaceWithLink: defineOperation({
      args: v.object({ code: v.string() }),
      returns: v.object({ spaceId: v.string() }),
    }),
    removeSpaceMember: defineOperation({
      args: v.object({ accountId: v.string(), spaceId: v.string() }),
      returns: v.null(),
    }),
    /** App-made IDs: see `createdId`. */
    createChannel: defineOperation({
      args: v.object({
        conversationId: v.optional(v.string()),
        name: v.string(),
        spaceId: v.string(),
      }),
      returns: v.object({ conversationId: v.string() }),
    }),
    renameChannel: defineOperation({
      args: v.object({ conversationId: v.string(), name: v.string() }),
      returns: v.null(),
    }),
    deleteChannel: defineOperation({
      args: v.object({ conversationId: v.string() }),
      returns: v.null(),
    }),
    registerPushToken: defineOperation({
      args: v.object({ token: v.string() }),
      returns: v.null(),
    }),
    unregisterPushToken: defineOperation({
      args: v.object({ token: v.string() }),
      returns: v.null(),
    }),
  },
  queries: {
    /**
     * Your conversations. With `channels`, it also lists the channels of
     * your spaces that you haven't left out of it; without, it lists only
     * direct messages and groups (as apps before the unified inbox expect).
     */
    inbox: defineOperation({
      args: v.object({ channels: v.optional(v.boolean()) }),
      returns: v.array(conversation),
    }),
    /**
     * What happened while you were away, newest first: messages from others
     * (one item per conversation) and others' reactions to your messages
     * (one per message). Muted conversations and channels left out of the
     * inbox don't appear. An item lasts until a day after you saw it (see
     * `markActivitySeen`), and nothing older than `ACTIVITY_HORIZON` shows.
     *
     * With `mentions`, each message that @mentions you is its own
     * `mention` item instead of counting toward its conversation's. A
     * conversation that alerts you only about mentions has nothing else
     * (without `mentions`, its item holds just those messages).
     */
    activity: defineOperation({
      args: v.object({ mentions: v.optional(v.boolean()) }),
      returns: v.array(activityItem),
    }),
    /** Which pushes you get (see `setNotificationSettings`). */
    notificationSettings: defineOperation({
      args: v.object({}),
      returns: notificationSettings,
    }),
    conversation: defineOperation({
      args: v.object({ conversationId: v.string() }),
      returns: v.union(v.null(), conversation),
    }),
    list: defineOperation({
      // At most one cursor: older than `before`, newer than `after`, centered
      // on the `around` message ID, or the latest page when none is given.
      args: v.object({
        after: v.optional(v.number()),
        around: v.optional(v.string()),
        before: v.optional(v.number()),
        conversationId: v.string(),
      }),
      returns: messagePage,
    }),
    /**
     * Reactions to the given messages, gathered from every member's PDS
     * (each stores its own accounts' reactions).
     */
    reactions: defineOperation({
      args: v.object({
        conversationId: v.string(),
        messageIds: v.array(v.string()),
      }),
      returns: v.array(reaction),
    }),
    /**
     * What this PDS has fetched of each link's preview so far (see
     * `prefetchLinkPreviews`), at most `MAX_LINK_PREVIEWS` links.
     */
    linkPreviews: defineOperation({
      args: v.object({ urls: v.array(v.string()) }),
      returns: v.array(linkCard),
    }),
    spaces: defineOperation({
      args: v.object({}),
      returns: v.array(space),
    }),
    space: defineOperation({
      args: v.object({ spaceId: v.string() }),
      returns: v.union(v.null(), space),
    }),
    /** Spaces you've been invited to and haven't answered, newest first. */
    spaceInvites: defineOperation({
      args: v.object({}),
      returns: v.array(spaceInvite),
    }),
    /**
     * A space's unexpired invite links: all of them for owners, your own
     * for members.
     */
    spaceInviteLinks: defineOperation({
      args: v.object({ spaceId: v.string() }),
      returns: v.array(spaceInviteLink),
    }),
    /** Where an invite link leads; null when it's unknown or expired. */
    spaceInviteLinkPreview: defineOperation({
      args: v.object({ code: v.string() }),
      returns: v.union(v.null(), spaceInviteLinkPreview),
    }),
  },
  requires: { accounts: DECENTRALIZED_CONVEX_VERSION },
});
