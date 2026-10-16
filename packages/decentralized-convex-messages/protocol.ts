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
  attachment,
  conversation,
  linkCard,
  message,
  messagePage,
  notificationSettings,
  reaction,
  space,
  spaceInvite,
  spaceInviteLink,
  spaceInviteLinkPreview,
  threadPage,
  threadState,
  threadSummary,
} from "./shapes.ts";
import { threadListQueries } from "./threadOperations.ts";

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
     * With `threadId`, a reply in that message's thread (a reply's own
     * thread when it names a reply). The thread's first reply also shows
     * in the conversation; later ones come back with `threadOnly`.
     */
    send: defineOperation({
      args: v.object({
        attachments: v.array(attachment),
        body: v.string(),
        conversationId: v.string(),
        messageId: v.string(),
        threadId: v.optional(v.string()),
      }),
      returns: message,
    }),
    /** Marks a thread read up to `readAt`, which sees its activity too. */
    markThreadRead: defineOperation({
      args: v.object({
        conversationId: v.string(),
        readAt: v.number(),
        threadId: v.string(),
      }),
      returns: v.null(),
    }),
    /**
     * Turns a thread's notifications on or off for you (its bell). Its
     * original's author and everyone who replies start with them on.
     */
    setThreadFollowed: defineOperation({
      args: v.object({
        conversationId: v.string(),
        followed: v.boolean(),
        threadId: v.string(),
      }),
      returns: v.null(),
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
    setMuted: defineOperation({
      args: v.object({ conversationId: v.string(), muted: v.boolean() }),
      returns: v.null(),
    }),
    /**
     * Hides alerts for every channel in a space, or shows them again. Each
     * channel's own `setMuted` still applies.
     */
    setSpaceMuted: defineOperation({
      args: v.object({ muted: v.boolean(), spaceId: v.string() }),
      returns: v.null(),
    }),
    /** Turns kinds of pushes on or off; fields left out stay as they are. */
    setNotificationSettings: defineOperation({
      args: v.object({
        channels: v.optional(v.boolean()),
        directMessages: v.optional(v.boolean()),
        enabled: v.optional(v.boolean()),
        groups: v.optional(v.boolean()),
        invites: v.optional(v.boolean()),
        reactions: v.optional(v.boolean()),
        replies: v.optional(v.boolean()),
        threadReplies: v.optional(v.boolean()),
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
    /**
     * Registers this device for the account's pushes. Apps that show
     * threads pass `threads`, so a push's badge counts threads' replies
     * (older apps can't see or clear them).
     */
    registerPushToken: defineOperation({
      args: v.object({ threads: v.optional(v.boolean()), token: v.string() }),
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
     * (one per message). With `threads`, also new replies in threads
     * you're in (one per thread); apps from before threads don't ask.
     * Muted conversations and channels left out of the inbox don't
     * appear. An item lasts until a day after you saw it (see
     * `markActivitySeen`), and nothing older than `ACTIVITY_HORIZON` shows.
     */
    activity: defineOperation({
      args: v.object({ threads: v.optional(v.boolean()) }),
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
     * A thread: its original message and one page of replies, oldest
     * first, gathered from every member's PDS. At most one cursor: older
     * than `before`, newer than `after`, or the latest page.
     */
    thread: defineOperation({
      args: v.object({
        after: v.optional(v.number()),
        before: v.optional(v.number()),
        conversationId: v.string(),
        threadId: v.string(),
      }),
      returns: threadPage,
    }),
    /**
     * The threads of the given messages that have replies, from every
     * member's PDS (each counts the replies it stores).
     */
    threadSummaries: defineOperation({
      args: v.object({
        conversationId: v.string(),
        messageIds: v.array(v.string()),
      }),
      returns: v.array(threadSummary),
    }),
    ...threadListQueries,
    /** Your place in a thread: its bell, and how far you've read. */
    threadState: defineOperation({
      args: v.object({ conversationId: v.string(), threadId: v.string() }),
      returns: threadState,
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
