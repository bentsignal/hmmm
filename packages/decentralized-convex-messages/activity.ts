import type { Doc } from "./_generated/dataModel.js";
import type { QueryCtx } from "./_generated/server.js";
import type { ConversationAccess } from "./model.ts";
import type { ActivityConversation, ActivityItem } from "./protocol.ts";
import { inboxAccess } from "./inbox.ts";
import { findAccess, getSpace, memberAddresses, toMessage } from "./model.ts";
import {
  ACTIVITY_HORIZON,
  ACTIVITY_SEEN_LIFETIME,
  MAX_ACTIVITY_MESSAGES,
} from "./protocol.ts";
import {
  MAX_REACTIONS_SCANNED,
  messagesKey,
  reactionsKey,
  sightingsOf,
  threadKey,
} from "./sightings.ts";

/** Messages read to fill one conversation's item, the caller's included. */
const MAX_MESSAGES_SCANNED = 300;
/** The threads with the newest replies that are looked at. */
const MAX_THREADS_SCANNED = 200;

/** Whether an item holds anything not yet seen on screen. */
export function isUnseen(item: ActivityItem) {
  return item.seenThrough === undefined || item.at > item.seenThrough;
}

/**
 * An item's newest sighting, and the newest activity in it that was seen
 * over a day ago (`goneThrough`), which no longer shows.
 */
async function seenState(
  ctx: QueryCtx,
  accountId: string,
  key: string,
  now: number,
) {
  const rows = await sightingsOf(ctx, accountId, key);
  let goneThrough = 0;
  for (const row of rows) {
    if (row.seenAt <= now - ACTIVITY_SEEN_LIFETIME) {
      goneThrough = Math.max(goneThrough, row.through);
    }
  }
  const latest = rows.at(-1);
  return {
    goneThrough,
    seen:
      latest === undefined
        ? {}
        : { seenAt: latest.seenAt, seenThrough: latest.through },
  };
}

/** Describes each conversation once, however many items it has. */
function conversationDescriber(ctx: QueryCtx) {
  const described = new Map<string, Promise<ActivityConversation>>();
  async function describe(conversation: Doc<"conversations">) {
    const [members, space] = await Promise.all([
      memberAddresses(ctx, conversation),
      conversation.spaceId === undefined
        ? null
        : getSpace(ctx, conversation.spaceId),
    ]);
    return {
      conversationId: conversation.conversationId,
      kind: conversation.kind,
      members,
      name: conversation.name ?? null,
      spaceId: conversation.spaceId ?? null,
      spaceName: space?.name,
    };
  }
  return (conversation: Doc<"conversations">) => {
    const known = described.get(conversation.conversationId);
    if (known !== undefined) return known;
    const found = describe(conversation);
    described.set(conversation.conversationId, found);
    return found;
  };
}

type Describe = ReturnType<typeof conversationDescriber>;

/**
 * Whether a conversation's activity shows: not muted (nor, for a channel,
 * its space), and a channel still in the inbox.
 */
function isHeard(access: ConversationAccess) {
  return (
    !access.muted &&
    !access.spaceMuted &&
    access.member?.hiddenFromInbox !== true
  );
}

/** Messages others sent in one conversation that still show, if any. */
async function messagesItem(
  ctx: QueryCtx,
  self: string,
  access: ConversationAccess,
  describe: Describe,
  now: number,
): Promise<ActivityItem | null> {
  const { conversationId } = access.conversation;
  const key = messagesKey(conversationId);
  const { goneThrough, seen } = await seenState(ctx, self, key, now);
  const since = Math.max(
    goneThrough,
    now - ACTIVITY_HORIZON,
    access.alertsSince,
  );
  const newer = ctx.db
    .query("messages")
    .withIndex("by_chat_sent", (index) =>
      index
        .eq("conversationId", conversationId)
        .eq("threadOnly", undefined)
        .gt("sentAt", since),
    )
    .order("desc");
  const theirs: Doc<"messages">[] = [];
  let scanned = 0;
  for await (const message of newer) {
    if (message.authorId !== self) theirs.push(message);
    scanned += 1;
    if (
      theirs.length >= MAX_ACTIVITY_MESSAGES ||
      scanned >= MAX_MESSAGES_SCANNED
    ) {
      break;
    }
  }
  const latest = theirs[0];
  if (latest === undefined) return null;
  return {
    ...seen,
    at: latest.sentAt,
    authors: [...new Set(theirs.map(({ authorId }) => authorId))],
    conversation: await describe(access.conversation),
    count: theirs.length,
    key,
    kind: "messages",
    latest: toMessage(latest),
  };
}

/** The caller's access to each conversation, each looked up once. */
function accessFinder(ctx: QueryCtx, self: string) {
  const access = new Map<string, Promise<ConversationAccess | null>>();
  return (conversationId: string) => {
    const known = access.get(conversationId);
    if (known !== undefined) return known;
    const found = findAccess(ctx, conversationId, self);
    access.set(conversationId, found);
    return found;
  };
}

type AccessTo = ReturnType<typeof accessFinder>;

function messageById(ctx: QueryCtx, messageId: string) {
  return ctx.db
    .query("messages")
    .withIndex("by_message", (index) => index.eq("messageId", messageId))
    .unique();
}

/**
 * Replies others sent in one thread the caller is in that still show, if
 * any. The thread's first reply is left out: it shows in the
 * conversation, and so in the conversation's item.
 */
async function threadItem(
  ctx: QueryCtx,
  self: string,
  member: Doc<"threadMembers">,
  { accessTo, describe }: { accessTo: AccessTo; describe: Describe },
  now: number,
): Promise<ActivityItem | null> {
  const { threadId } = member;
  const found = await accessTo(member.conversationId);
  if (found === null || !isHeard(found)) return null;
  const key = threadKey(threadId);
  const { goneThrough, seen } = await seenState(ctx, self, key, now);
  const since = Math.max(goneThrough, now - ACTIVITY_HORIZON, found.alertsSince);
  const newer = ctx.db
    .query("messages")
    .withIndex("by_thread_sent", (index) =>
      index.eq("threadId", threadId).gt("sentAt", since),
    )
    .order("desc");
  const theirs: Doc<"messages">[] = [];
  let scanned = 0;
  for await (const message of newer) {
    if (message.authorId !== self && message.threadOnly === true) {
      theirs.push(message);
    }
    scanned += 1;
    if (
      theirs.length >= MAX_ACTIVITY_MESSAGES ||
      scanned >= MAX_MESSAGES_SCANNED
    ) {
      break;
    }
  }
  const latest = theirs[0];
  if (latest === undefined) return null;
  const root = await messageById(ctx, threadId);
  return {
    ...seen,
    at: latest.sentAt,
    authors: [...new Set(theirs.map(({ authorId }) => authorId))],
    conversation: await describe(found.conversation),
    count: theirs.length,
    key,
    kind: "thread",
    latest: toMessage(latest),
    root: root === null ? null : toMessage(root),
    threadId,
  };
}

/** New replies in the threads the caller is in and hasn't turned off. */
async function threadItems(
  ctx: QueryCtx,
  self: string,
  lookups: { accessTo: AccessTo; describe: Describe },
  now: number,
) {
  const members = await ctx.db
    .query("threadMembers")
    .withIndex("by_account_reply", (index) =>
      index.eq("accountId", self).gt("lastReplyAt", now - ACTIVITY_HORIZON),
    )
    .order("desc")
    .take(MAX_THREADS_SCANNED);
  return Promise.all(
    members
      .filter((member) => member.unfollowed !== true)
      .map((member) => threadItem(ctx, self, member, lookups, now)),
  );
}

/** Others' reactions to the caller's messages that still show, by message. */
async function reactionItems(
  ctx: QueryCtx,
  self: string,
  { accessTo, describe }: { accessTo: AccessTo; describe: Describe },
  now: number,
) {
  const rows = await ctx.db
    .query("reactions")
    .withIndex("by_author_reacted", (index) =>
      index.eq("messageAuthorId", self).gt("reactedAt", now - ACTIVITY_HORIZON),
    )
    .order("desc")
    .take(MAX_REACTIONS_SCANNED);
  const byMessage = new Map<string, Doc<"reactions">[]>();
  for (const row of rows) {
    if (row.accountId === self) continue;
    byMessage.set(row.messageId, [
      ...(byMessage.get(row.messageId) ?? []),
      row,
    ]);
  }
  return Promise.all(
    [...byMessage].map(
      async ([messageId, reactions]): Promise<ActivityItem | null> => {
        const conversationId = reactions[0]?.conversationId ?? "";
        const found = await accessTo(conversationId);
        if (found === null || !isHeard(found)) return null;
        const key = reactionsKey(messageId);
        const { goneThrough, seen } = await seenState(ctx, self, key, now);
        const shown = reactions.filter(
          ({ reactedAt }) =>
            reactedAt > Math.max(goneThrough, found.alertsSince),
        );
        const newest = shown[0];
        if (newest === undefined) return null;
        const message = await messageById(ctx, messageId);
        if (message?.authorId !== self) return null;
        return {
          ...seen,
          at: newest.reactedAt,
          conversation: await describe(found.conversation),
          key,
          kind: "reactions",
          message: toMessage(message),
          reactions: shown.map(({ accountId, emoji, reactedAt }) => ({
            accountId,
            emoji,
            messageId,
            reactedAt,
          })),
        };
      },
    ),
  );
}

/**
 * What happened while the caller was away, newest first: messages others
 * sent (an item per conversation), others' reactions to the caller's
 * messages (an item per message), and with `threads`, others' replies in
 * threads the caller is in (an item per thread). It skips muted
 * conversations (and
 * muted spaces' channels) and what came in before they were unmuted,
 * channels left out of the inbox, activity seen over a day ago, and
 * anything older than `ACTIVITY_HORIZON`.
 *
 * Only this PDS's messages and reactions are listed, like the inbox.
 */
export async function activity(
  ctx: QueryCtx,
  self: string,
  threads = false,
) {
  const now = Date.now();
  const lookups = {
    accessTo: accessFinder(ctx, self),
    describe: conversationDescriber(ctx),
  };
  const conversations = (await inboxAccess(ctx, self, true)).filter(isHeard);
  const [messages, reactions, replies] = await Promise.all([
    Promise.all(
      conversations.map((access) =>
        messagesItem(ctx, self, access, lookups.describe, now),
      ),
    ),
    reactionItems(ctx, self, lookups, now),
    threads ? threadItems(ctx, self, lookups, now) : [],
  ]);
  return [...messages, ...reactions, ...replies]
    .filter((item): item is ActivityItem => item !== null)
    .sort((left, right) => right.at - left.at);
}
