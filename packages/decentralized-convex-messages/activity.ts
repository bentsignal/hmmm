import type { OperationArgs } from "@decentralized-convex/plugin";

import type { Doc } from "./_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "./_generated/server.js";
import type { ConversationAccess } from "./model.ts";
import type {
  ActivityConversation,
  ActivityItem,
  messagesProtocol,
} from "./protocol.ts";
import { inboxAccess } from "./inbox.ts";
import {
  fail,
  findAccess,
  getSpace,
  memberAddresses,
  toMessage,
} from "./model.ts";
import {
  ACTIVITY_HORIZON,
  ACTIVITY_SEEN_LIFETIME,
  MAX_ACTIVITY_MESSAGES,
  MAX_ACTIVITY_SIGHTINGS,
} from "./protocol.ts";

type Args = OperationArgs<
  (typeof messagesProtocol)["mutations"]["markActivitySeen"]
>;

/** Messages read to fill one conversation's item, the caller's included. */
const MAX_MESSAGES_SCANNED = 300;
/** The newest reactions to the caller's messages that activity looks at. */
const MAX_REACTIONS_SCANNED = 500;
const MAX_KEY_LENGTH = 300;
/** Old sightings deleted per `markActivitySeen`, so it stays quick. */
const MAX_PRUNED = 20;

/** Whether an item holds anything not yet seen on screen. */
export function isUnseen(item: ActivityItem) {
  return item.seenThrough === undefined || item.at > item.seenThrough;
}

/** The item for messages others sent in a conversation. */
export function messagesKey(conversationId: string) {
  return `messages:${conversationId}`;
}

/** The item for others' reactions to one of the caller's messages. */
export function reactionsKey(messageId: string) {
  return `reactions:${messageId}`;
}

function sightingsOf(ctx: QueryCtx, accountId: string, key: string) {
  return ctx.db
    .query("activitySightings")
    .withIndex("by_account_key", (index) =>
      index.eq("accountId", accountId).eq("key", key),
    )
    .collect();
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
  const since = Math.max(goneThrough, now - ACTIVITY_HORIZON);
  const newer = ctx.db
    .query("messages")
    .withIndex("by_conversation_sent", (index) =>
      index.eq("conversationId", conversationId).gt("sentAt", since),
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

/** Others' reactions to the caller's messages that still show, by message. */
async function reactionItems(
  ctx: QueryCtx,
  self: string,
  describe: Describe,
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
  const access = new Map<string, Promise<ConversationAccess | null>>();
  function accessTo(conversationId: string) {
    const known = access.get(conversationId);
    if (known !== undefined) return known;
    const found = findAccess(ctx, conversationId, self);
    access.set(conversationId, found);
    return found;
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
          ({ reactedAt }) => reactedAt > goneThrough,
        );
        const newest = shown[0];
        if (newest === undefined) return null;
        const message = await ctx.db
          .query("messages")
          .withIndex("by_message", (index) => index.eq("messageId", messageId))
          .unique();
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
 * sent (an item per conversation) and others' reactions to the caller's
 * messages (an item per message). It skips muted conversations (and
 * muted spaces' channels), channels left out of the inbox, activity seen over a day ago, and
 * anything older than `ACTIVITY_HORIZON`.
 *
 * Only this PDS's messages and reactions are listed, like the inbox.
 */
export async function activity(ctx: QueryCtx, self: string) {
  const now = Date.now();
  const describe = conversationDescriber(ctx);
  const conversations = (await inboxAccess(ctx, self, true)).filter(isHeard);
  const [messages, reactions] = await Promise.all([
    Promise.all(
      conversations.map((access) =>
        messagesItem(ctx, self, access, describe, now),
      ),
    ),
    reactionItems(ctx, self, describe, now),
  ]);
  return [...messages, ...reactions]
    .filter((item): item is ActivityItem => item !== null)
    .sort((left, right) => right.at - left.at);
}

/**
 * Records that items came into view, through their newest activity then.
 * Seeing an item again without anything new in it changes nothing, so it
 * still goes a day after it was first seen.
 */
export async function markActivitySeen(
  ctx: MutationCtx,
  self: string,
  args: Args,
) {
  if (args.items.length > MAX_ACTIVITY_SIGHTINGS) fail("TOO_MANY_ITEMS");
  const now = Date.now();
  for (const { key, through } of args.items) {
    if (key.length === 0 || key.length > MAX_KEY_LENGTH) fail("INVALID_KEY");
    if (!Number.isFinite(through)) fail("INVALID_SIGHTING");
    const rows = await sightingsOf(ctx, self, key);
    const seenThrough = Math.min(through, now);
    const latest = rows.at(-1);
    if (latest !== undefined && latest.through >= seenThrough) continue;
    await ctx.db.insert("activitySightings", {
      accountId: self,
      key,
      seenAt: now,
      through: seenThrough,
    });
    // Of the sightings over a day old, only the newest hides anything.
    const old = rows.filter(
      ({ seenAt }) => seenAt <= now - ACTIVITY_SEEN_LIFETIME,
    );
    for (const row of old.slice(0, -1)) await ctx.db.delete(row._id);
  }
  // Sightings from before the horizon hide nothing that could still show.
  const stale = await ctx.db
    .query("activitySightings")
    .withIndex("by_account_seen", (index) =>
      index.eq("accountId", self).lt("seenAt", now - ACTIVITY_HORIZON),
    )
    .take(MAX_PRUNED);
  for (const row of stale) await ctx.db.delete(row._id);
  return null;
}
