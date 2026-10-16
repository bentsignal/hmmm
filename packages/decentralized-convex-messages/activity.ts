import type { Doc } from "./_generated/dataModel.js";
import type { QueryCtx } from "./_generated/server.js";
import type { ConversationAccess } from "./model.ts";
import type {
  ActivityConversation,
  ActivityItem,
  AlertLevel,
} from "./protocol.ts";
import type { AccountSettings } from "./settings.ts";
import { alerts, alertsFor } from "./alerts.ts";
import { inboxAccess } from "./inbox.ts";
import { findAccess, getSpace, memberAddresses, toMessage } from "./model.ts";
import {
  ACTIVITY_HORIZON,
  ACTIVITY_SEEN_LIFETIME,
  MAX_ACTIVITY_MESSAGES,
} from "./protocol.ts";
import { notificationSettings } from "./settings.ts";
import {
  MAX_MENTIONS_SCANNED,
  MAX_REACTIONS_SCANNED,
  mentionKey,
  messagesKey,
  reactionsKey,
  sightingsOf,
} from "./sightings.ts";

/** Messages read to fill one conversation's item, the caller's included. */
const MAX_MESSAGES_SCANNED = 300;

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

/** Finds the caller's access to each conversation once. */
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

/** What one call of `activity` works from. */
interface Scope {
  readonly accessTo: AccessTo;
  readonly describe: Describe;
  /** Whether mentions are their own items (see `activity`). */
  readonly mentions: boolean;
  readonly now: number;
  readonly self: string;
  readonly settings: AccountSettings;
}

/**
 * Whether a conversation's messages show at all: it alerts about something,
 * and a channel is still in the inbox.
 */
function isHeard(access: ConversationAccess, level: AlertLevel) {
  return level !== "none" && access.member?.hiddenFromInbox !== true;
}

/**
 * Whether a message from someone else counts toward its conversation's
 * item: with mentions as their own items, it doesn't if it mentions the
 * caller, and at `mentions` nothing else does. Without them, a message
 * counts if it alerts the caller.
 */
function countsInItem(
  scope: Scope,
  level: AlertLevel,
  message: Doc<"messages">,
) {
  if (!scope.mentions) return alerts(level, message, scope.self);
  return level === "all" && !alerts("mentions", message, scope.self);
}

/** Messages others sent in one conversation that still show, if any. */
async function messagesItem(
  ctx: QueryCtx,
  scope: Scope,
  access: ConversationAccess,
  level: AlertLevel,
): Promise<ActivityItem | null> {
  const { describe, now, self } = scope;
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
    .withIndex("by_conversation_sent", (index) =>
      index.eq("conversationId", conversationId).gt("sentAt", since),
    )
    .order("desc");
  const theirs: Doc<"messages">[] = [];
  let scanned = 0;
  for await (const message of newer) {
    if (message.authorId !== self && countsInItem(scope, level, message)) {
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
async function reactionItems(ctx: QueryCtx, scope: Scope) {
  const { accessTo, describe, now, self, settings } = scope;
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
        if (found === null || !isHeard(found, alertsFor(found, settings))) {
          return null;
        }
        const key = reactionsKey(messageId);
        const { goneThrough, seen } = await seenState(ctx, self, key, now);
        const shown = reactions.filter(
          ({ reactedAt }) =>
            reactedAt > Math.max(goneThrough, found.alertsSince),
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
 * Messages that @mention the caller and still show, an item each. A
 * mention shows from any conversation that alerts about something, even a
 * channel left out of the inbox.
 */
async function mentionItems(ctx: QueryCtx, scope: Scope) {
  const { accessTo, describe, now, self, settings } = scope;
  const rows = await ctx.db
    .query("mentions")
    .withIndex("by_account_sent", (index) =>
      index.eq("accountId", self).gt("sentAt", now - ACTIVITY_HORIZON),
    )
    .order("desc")
    .take(MAX_MENTIONS_SCANNED);
  return Promise.all(
    rows.map(async (row): Promise<ActivityItem | null> => {
      const found = await accessTo(row.conversationId);
      if (found === null || alertsFor(found, settings) === "none") return null;
      const key = mentionKey(row.messageId);
      const { goneThrough, seen } = await seenState(ctx, self, key, now);
      if (row.sentAt <= Math.max(goneThrough, found.alertsSince)) return null;
      const message = await ctx.db
        .query("messages")
        .withIndex("by_message", (index) =>
          index.eq("messageId", row.messageId),
        )
        .unique();
      if (message === null || message.authorId === self) return null;
      return {
        ...seen,
        at: message.sentAt,
        conversation: await describe(found.conversation),
        key,
        kind: "mention",
        message: toMessage(message),
      };
    }),
  );
}

/**
 * What happened while the caller was away, newest first: messages others
 * sent (an item per conversation) and others' reactions to the caller's
 * messages (an item per message). With `mentions`, each message that
 * @mentions the caller is an item of its own too. Each conversation shows
 * what it alerts about (`alertsFor`): nothing from one at `none`, nor from
 * before its alerts came back on, and only mentions from one at
 * `mentions`. It also skips channels left out of the inbox (except for
 * mentions), activity seen over a day ago, and anything older than
 * `ACTIVITY_HORIZON`.
 *
 * Only this PDS's messages and reactions are listed, like the inbox.
 */
export async function activity(
  ctx: QueryCtx,
  self: string,
  options: { mentions?: boolean } = {},
) {
  const scope: Scope = {
    accessTo: accessFinder(ctx, self),
    describe: conversationDescriber(ctx),
    mentions: options.mentions === true,
    now: Date.now(),
    self,
    settings: await notificationSettings(ctx, self),
  };
  const conversations = (await inboxAccess(ctx, self, true)).flatMap(
    (access) => {
      const level = alertsFor(access, scope.settings);
      return isHeard(access, level) ? [{ access, level }] : [];
    },
  );
  const [messages, reactions, mentions] = await Promise.all([
    Promise.all(
      conversations.map(({ access, level }) =>
        messagesItem(ctx, scope, access, level),
      ),
    ),
    reactionItems(ctx, scope),
    scope.mentions ? mentionItems(ctx, scope) : [],
  ]);
  return [...messages, ...reactions, ...mentions]
    .filter((item): item is ActivityItem => item !== null)
    .sort((left, right) => right.at - left.at);
}
