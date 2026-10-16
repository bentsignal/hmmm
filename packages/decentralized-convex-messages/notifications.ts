import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel.js";
import type { QueryCtx } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server.js";
import { badgeCount } from "./badges.ts";
import { badgeCounts, badgeField, deliver } from "./delivery.ts";
import { getConversation, getSpace, memberAddresses } from "./model.ts";
import { listNames } from "./naming.ts";
import {
  accountProfile,
  ANDROID_DELIVERY,
  conversationName,
  displayNames,
  previewText,
  wantsAlerts,
} from "./pushParts.ts";
import { messagePushKind, wantsPush } from "./settings.ts";
import { threadMembers } from "./threads.ts";

/**
 * What a push about a reply says it is: a reply to the recipient's own
 * message, or one in a thread they're in. Null for a plain message push.
 */
type ReplyPush = "thread" | "yours" | null;

/**
 * Who hears about a message, and as what. A message in the conversation
 * (a thread's first reply included) goes to its members; its original's
 * author hears of a first reply as a reply to their message, unless they
 * turned those off. A reply kept in its thread goes only to the people in
 * the thread who haven't turned it off: its original's author as a reply
 * to their message, everyone else as a thread reply.
 */
async function listeners(
  ctx: QueryCtx,
  message: Doc<"messages">,
  conversation: Doc<"conversations">,
  members: readonly string[],
) {
  if (message.threadOnly === true && message.threadId !== undefined) {
    return threadListeners(ctx, message, conversation, message.threadId);
  }
  const heard: { accountId: string; reply: ReplyPush }[] = [];
  for (const accountId of members) {
    if (accountId === message.authorId) continue;
    if (!(await wantsAlerts(ctx, conversation, accountId))) continue;
    const reply = await chatPush(ctx, message, conversation, accountId);
    if (reply !== undefined) heard.push({ accountId, reply });
  }
  return heard;
}

/**
 * What a member hears of a message in the conversation: a reply to their
 * message, the message, or (undefined) nothing.
 */
async function chatPush(
  ctx: QueryCtx,
  message: Doc<"messages">,
  conversation: Doc<"conversations">,
  accountId: string,
): Promise<ReplyPush | undefined> {
  const yours =
    message.threadId !== undefined && message.quote?.authorId === accountId;
  if (yours && (await wantsPush(ctx, accountId, "replies"))) return "yours";
  const kind = messagePushKind(conversation.kind);
  return (await wantsPush(ctx, accountId, kind)) ? null : undefined;
}

/** The people in a reply's thread who hear about it (see `listeners`). */
async function threadListeners(
  ctx: QueryCtx,
  message: Doc<"messages">,
  conversation: Doc<"conversations">,
  threadId: string,
) {
  const heard: { accountId: string; reply: ReplyPush }[] = [];
  for (const member of await threadMembers(ctx, threadId)) {
    const { accountId } = member;
    if (accountId === message.authorId || member.unfollowed === true) {
      continue;
    }
    if (!(await wantsAlerts(ctx, conversation, accountId))) continue;
    const yours = accountId === message.quote?.authorId;
    const kind = yours ? "replies" : "threadReplies";
    if (await wantsPush(ctx, accountId, kind)) {
      heard.push({ accountId, reply: yours ? "yours" : "thread" });
    }
  }
  return heard;
}

/** Who to notify about a message, and what to show them. */
export const targets = internalQuery({
  args: { messageId: v.string() },
  handler: async (ctx, { messageId }) => {
    const message = await ctx.db
      .query("messages")
      .withIndex("by_message", (index) => index.eq("messageId", messageId))
      .unique();
    if (message === null) return null;
    const conversation = await getConversation(ctx, message.conversationId);
    if (conversation === null) return null;

    const members = await memberAddresses(ctx, conversation);
    const recipients: {
      accountId: string;
      reply: ReplyPush;
      token: string;
    }[] = [];
    for (const { accountId, reply } of await listeners(
      ctx,
      message,
      conversation,
      members,
    )) {
      const rows = await ctx.db
        .query("pushTokens")
        .withIndex("by_account", (index) => index.eq("accountId", accountId))
        .collect();
      recipients.push(
        ...rows.map(({ token }) => ({ accountId, reply, token })),
      );
    }
    return {
      body: previewText(message),
      conversationId: conversation.conversationId,
      conversationName: await conversationName(ctx, conversation),
      messageId: message.messageId,
      // A group without a name is titled with the other members' names,
      // which differ for each recipient.
      unnamedGroupMembers:
        conversation.kind === "group" && conversation.name === undefined
          ? members
          : null,
      kind: conversation.kind,
      recipients,
      senderId: message.authorId,
      senderName: message.authorName,
      threadId: message.threadId ?? null,
      threadOnly: message.threadOnly === true,
    };
  },
});

/** A reply push's body: what it is, then the reply. */
function replyBody(reply: ReplyPush, body: string) {
  if (reply === null) return body;
  const what =
    reply === "yours" ? "Replied to your message" : "Replied in a thread";
  return body.length === 0 ? what : `${what}: ${body}`;
}
/**
 * The account's app icon badge (see `badgeCount`), read in its own query so
 * a push to a large space doesn't count every member in one transaction.
 */
export const badge = internalQuery({
  args: { accountId: v.string() },
  handler: (ctx, { accountId }) => badgeCount(ctx, accountId),
});

/** Who to tell about new space invitations, and the space's name. */
export const inviteTargets = internalQuery({
  args: { accountIds: v.array(v.string()), spaceId: v.string() },
  handler: async (ctx, { accountIds, spaceId }) => {
    const space = await getSpace(ctx, spaceId);
    if (space === null) return null;
    const recipients: { accountId: string; token: string }[] = [];
    for (const accountId of accountIds) {
      // Skip anyone who already answered before this ran.
      const invite = await ctx.db
        .query("spaceInvites")
        .withIndex("by_space_account", (index) =>
          index.eq("spaceId", spaceId).eq("accountId", accountId),
        )
        .unique();
      if (invite === null) continue;
      if (!(await wantsPush(ctx, accountId, "invites"))) continue;
      const rows = await ctx.db
        .query("pushTokens")
        .withIndex("by_account", (index) => index.eq("accountId", accountId))
        .collect();
      recipients.push(...rows.map(({ token }) => ({ accountId, token })));
    }
    return { recipients, spaceName: space.name };
  },
});

/**
 * Sends one Expo push per recipient device. iOS shows it as a communication
 * notification: the app's Notification Service Extension reads `data`
 * (sender, avatar, conversation) and turns it into a message intent, so the
 * sender's photo becomes the icon. Without the extension, the title is the
 * sender and the subtitle names the group or channel.
 */
export const send = internalAction({
  args: { messageId: v.string() },
  handler: async (ctx, { messageId }) => {
    const target = await ctx.runQuery(internal.notifications.targets, {
      messageId,
    });
    if (target === null || target.recipients.length === 0) return;
    const [sender, badges, memberNames] = await Promise.all([
      accountProfile(target.senderId),
      badgeCounts(ctx, target.recipients),
      displayNames([...(target.unnamedGroupMembers ?? [])].sort()),
    ]);
    const senderName = sender?.displayName ?? target.senderName;
    const { conversationName: name } = target;
    /** An unnamed group's title leaves out whoever it's for. */
    function conversationNameFor(accountId: string) {
      const others = memberNames.filter(([member]) => member !== accountId);
      return others.length === 0
        ? name
        : listNames(others.map(([, other]) => other));
    }

    await deliver(
      ctx,
      target.recipients.map(({ accountId, reply, token }) => {
        const conversationName = conversationNameFor(accountId);
        // A reply kept in its thread opens the thread. Its `messageId` is
        // the original, where apps from before threads open the
        // conversation, since the reply isn't in it.
        const thread =
          target.threadOnly && target.threadId !== null
            ? {
                messageId: target.threadId,
                replyId: target.messageId,
                threadId: target.threadId,
              }
            : {};
        return {
          ...badgeField(badges.get(accountId)),
          body: replyBody(reply, target.body),
          // A device signed into several accounts opens the message as
          // the account it was sent to.
          data: {
            accountId,
            conversationId: target.conversationId,
            conversationName,
            kind: target.kind,
            messageId: target.messageId,
            senderAvatarUrl: sender?.avatarUrl ?? null,
            senderId: target.senderId,
            senderName,
            ...thread,
          },
          ...ANDROID_DELIVERY,
          // Lets the iOS Notification Service Extension rewrite it.
          mutableContent: true,
          sound: "default",
          ...(conversationName === null ? {} : { subtitle: conversationName }),
          threadId: target.conversationId,
          title: senderName,
          to: token,
        };
      }),
    );
  },
});

/**
 * Tells newly invited people about a space invitation. `data.kind` is
 * `spaceInvite` and `data.spaceId` names the space, so the app can open its
 * invites and dismiss the notification once the invite is answered.
 */
export const sendInvite = internalAction({
  args: {
    accountIds: v.array(v.string()),
    invitedBy: v.string(),
    spaceId: v.string(),
  },
  handler: async (ctx, { accountIds, invitedBy, spaceId }) => {
    const target = await ctx.runQuery(internal.notifications.inviteTargets, {
      accountIds,
      spaceId,
    });
    if (target === null || target.recipients.length === 0) return;
    const [inviter, badges] = await Promise.all([
      accountProfile(invitedBy),
      badgeCounts(ctx, target.recipients),
    ]);
    const inviterName = inviter?.displayName ?? invitedBy.split("@")[0];
    await deliver(
      ctx,
      target.recipients.map(({ accountId, token }) => ({
        ...badgeField(badges.get(accountId)),
        body: `${inviterName} invited you to join ${target.spaceName}`,
        data: {
          accountId,
          invitedBy,
          kind: "spaceInvite",
          spaceId,
          spaceName: target.spaceName,
        },
        ...ANDROID_DELIVERY,
        sound: "default",
        title: target.spaceName,
        to: token,
      })),
    );
  },
});
export const removeTokens = internalMutation({
  args: { tokens: v.array(v.string()) },
  handler: async (ctx, { tokens }) => {
    for (const token of tokens) {
      const rows = await ctx.db
        .query("pushTokens")
        .withIndex("by_token", (index) => index.eq("token", token))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }
  },
});
