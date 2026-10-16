import type { Doc } from "./_generated/dataModel.js";
import type { QueryCtx } from "./_generated/server.js";
import type { Scope } from "./activityScope.ts";
import type { ConversationAccess } from "./model.ts";
import type { ActivityItem, AlertLevel } from "./protocol.ts";
import {
  accessFinder,
  conversationDescriber,
  isHeard,
  leftForMention,
  messageById,
  seenState,
} from "./activityScope.ts";
import { alerts, alertsFor } from "./alerts.ts";
import { inboxAccess } from "./inbox.ts";
import { toMessage } from "./model.ts";
import { ACTIVITY_HORIZON, MAX_ACTIVITY_MESSAGES } from "./protocol.ts";
import { notificationSettings } from "./settings.ts";
import {
  MAX_MENTIONS_SCANNED,
  MAX_REACTIONS_SCANNED,
  mentionKey,
  messagesKey,
  reactionsKey,
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
  return level === "all" && !leftForMention(scope, message);
}

/**
 * The newest of others' messages `newer` lists that `counts`, at most
 * `MAX_ACTIVITY_MESSAGES` of them.
 */
async function othersNewest(
  scope: Scope,
  newer: AsyncIterable<Doc<"messages">>,
  counts: (message: Doc<"messages">) => boolean,
) {
  const theirs = new Array<Doc<"messages">>();
  let scanned = 0;
  for await (const message of newer) {
    if (message.authorId !== scope.self && counts(message)) {
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
  return theirs;
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
    .withIndex("by_chat_sent", (index) =>
      index
        .eq("conversationId", conversationId)
        .eq("threadOnly", undefined)
        .gt("sentAt", since),
    )
    .order("desc");
  const theirs = await othersNewest(scope, newer, (message) =>
    countsInItem(scope, level, message),
  );
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

/**
 * Replies others sent in one thread the caller is in that still show, if
 * any. The thread's first reply is left out: it shows in the
 * conversation, and so in the conversation's item. A thread shows at any
 * level but `none`.
 */
async function threadItem(
  ctx: QueryCtx,
  scope: Scope,
  member: Doc<"threadMembers">,
): Promise<ActivityItem | null> {
  const { accessTo, describe, now, self, settings } = scope;
  const { threadId } = member;
  const found = await accessTo(member.conversationId);
  if (found === null || !isHeard(found, alertsFor(found, settings))) {
    return null;
  }
  const key = threadKey(threadId);
  const { goneThrough, seen } = await seenState(ctx, self, key, now);
  const since = Math.max(
    goneThrough,
    now - ACTIVITY_HORIZON,
    found.alertsSince,
  );
  const newer = ctx.db
    .query("messages")
    .withIndex("by_thread_sent", (index) =>
      index.eq("threadId", threadId).gt("sentAt", since),
    )
    .order("desc");
  const theirs = await othersNewest(
    scope,
    newer,
    (message) => message.threadOnly === true && !leftForMention(scope, message),
  );
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
async function threadItems(ctx: QueryCtx, scope: Scope) {
  const members = await ctx.db
    .query("threadMembers")
    .withIndex("by_account_reply", (index) =>
      index
        .eq("accountId", scope.self)
        .gt("lastReplyAt", scope.now - ACTIVITY_HORIZON),
    )
    .order("desc")
    .take(MAX_THREADS_SCANNED);
  return Promise.all(
    members
      .filter((member) => member.unfollowed !== true)
      .map((member) => threadItem(ctx, scope, member)),
  );
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
 * Messages that @mention the caller and still show, an item each. A
 * mention shows from any conversation that alerts about something, even a
 * channel left out of the inbox. One in a reply kept in its thread shows
 * only to apps that show threads, since only they can open it.
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
      if (row.threadId !== undefined && !scope.threads) return null;
      const found = await accessTo(row.conversationId);
      if (found === null || alertsFor(found, settings) === "none") return null;
      const key = mentionKey(row.messageId);
      const { goneThrough, seen } = await seenState(ctx, self, key, now);
      if (row.sentAt <= Math.max(goneThrough, found.alertsSince)) return null;
      const message = await messageById(ctx, row.messageId);
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

/** What the app asking for activity shows (see `activity`). */
export interface ActivityOptions {
  readonly mentions?: boolean;
  readonly threads?: boolean;
}

/**
 * What happened while the caller was away, newest first: messages others
 * sent (an item per conversation) and others' reactions to the caller's
 * messages (an item per message). With `threads`, others' replies in
 * threads the caller is in are an item per thread; with `mentions`, each
 * message that @mentions the caller is an item of its own. Each
 * conversation shows what it alerts about (`alertsFor`): nothing from one
 * at `none`, nor from before its alerts came back on, and only mentions
 * (and threads) from one at `mentions`. It also skips channels left out
 * of the inbox (except for mentions), activity seen over a day ago, and
 * anything older than `ACTIVITY_HORIZON`.
 *
 * Only this PDS's messages and reactions are listed, like the inbox.
 */
export async function activity(
  ctx: QueryCtx,
  self: string,
  options: ActivityOptions = {},
) {
  const scope: Scope = {
    accessTo: accessFinder(ctx, self),
    describe: conversationDescriber(ctx),
    mentions: options.mentions === true,
    now: Date.now(),
    self,
    settings: await notificationSettings(ctx, self),
    threads: options.threads === true,
  };
  const conversations = (await inboxAccess(ctx, self, true)).flatMap(
    (access) => {
      const level = alertsFor(access, scope.settings);
      return isHeard(access, level) ? [{ access, level }] : [];
    },
  );
  const [messages, reactions, mentions, replies] = await Promise.all([
    Promise.all(
      conversations.map(({ access, level }) =>
        messagesItem(ctx, scope, access, level),
      ),
    ),
    reactionItems(ctx, scope),
    scope.mentions ? mentionItems(ctx, scope) : [],
    scope.threads ? threadItems(ctx, scope) : [],
  ]);
  return [...messages, ...reactions, ...mentions, ...replies]
    .filter((item): item is ActivityItem => item !== null)
    .sort((left, right) => right.at - left.at);
}
