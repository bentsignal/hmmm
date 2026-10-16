import type { OperationArgs } from "@decentralized-convex/plugin";

import type { Doc } from "./_generated/dataModel.js";
import type { QueryCtx } from "./_generated/server.js";
import type {
  InboxThread,
  messagesProtocol,
  ThreadListing,
} from "./protocol.ts";
import { accessFinder, conversationDescriber, isHeard } from "./activity.ts";
import { memberAddresses, requireAccess, toMessage } from "./model.ts";
import {
  MAX_INBOX_THREADS,
  MAX_THREAD_UNREAD,
  THREAD_PAGE_SIZE,
} from "./protocol.ts";
import { messageById, threadMember, threadRow } from "./threads.ts";

// Lists of threads: a conversation's (its info page), and every thread an
// account follows (its inbox).

type Args = OperationArgs<(typeof messagesProtocol)["queries"]["threads"]>;

/** Replies read to count one thread's unread ones, the caller's included. */
const MAX_REPLIES_SCANNED = 300;
/** Thread memberships looked at for one page of the caller's threads. */
const MAX_MEMBERSHIPS_SCANNED = 500;
/** The most relevant matching messages a search turns into threads. */
const MAX_SEARCH_MATCHES = 256;
/** Longer searches are cut to this many characters. */
const MAX_SEARCH_LENGTH = 200;

/**
 * Others' replies after `lastReadAt`, leaving out the thread's first
 * reply, which shows (and is read) in the conversation.
 */
async function unreadReplies(
  ctx: QueryCtx,
  self: string,
  threadId: string,
  lastReadAt: number,
) {
  const newer = ctx.db
    .query("messages")
    .withIndex("by_thread_sent", (index) =>
      index.eq("threadId", threadId).gt("sentAt", lastReadAt),
    );
  let unread = 0;
  let scanned = 0;
  for await (const reply of newer) {
    if (reply.authorId !== self && reply.threadOnly === true) unread += 1;
    scanned += 1;
    if (unread >= MAX_THREAD_UNREAD || scanned >= MAX_REPLIES_SCANNED) break;
  }
  return unread;
}

/** A thread with replies here, and the caller's place in it. */
async function toListing(
  ctx: QueryCtx,
  self: string,
  row: Doc<"threads">,
  member: Doc<"threadMembers"> | null,
): Promise<ThreadListing> {
  const following = member !== null && member.unfollowed !== true;
  const [root, unreadCount] = await Promise.all([
    messageById(ctx, row.threadId),
    following ? unreadReplies(ctx, self, row.threadId, member.lastReadAt) : 0,
  ]);
  return {
    conversationId: row.conversationId,
    following,
    lastReadAt: member?.lastReadAt ?? null,
    lastReplyAt: row.lastReplyAt,
    replyCount: row.replyCount,
    repliers: row.repliers,
    root: root?.conversationId === row.conversationId ? toMessage(root) : null,
    threadId: row.threadId,
    unreadCount,
  };
}

interface Found {
  readonly member: Doc<"threadMembers"> | null;
  readonly row: Doc<"threads">;
}

/** Every thread in a conversation, newest reply first, before `before`. */
async function everyThread(
  ctx: QueryCtx,
  self: string,
  args: Args,
  limit: number,
) {
  const rows = await ctx.db
    .query("threads")
    .withIndex("by_conversation_reply", (index) => {
      const conversation = index.eq("conversationId", args.conversationId);
      return args.before === undefined
        ? conversation
        : conversation.lt("lastReplyAt", args.before);
    })
    .order("desc")
    .take(limit + 1);
  const found = await Promise.all(
    rows.map(async (row) => ({
      member: await threadMember(ctx, row.threadId, self),
      row,
    })),
  );
  return { found, hasMore: rows.length > limit };
}

/** The threads in a conversation the caller follows, as `everyThread`. */
async function followedThreads(
  ctx: QueryCtx,
  self: string,
  args: Args,
  limit: number,
) {
  const memberships = ctx.db
    .query("threadMembers")
    .withIndex("by_account_reply", (index) => {
      const account = index.eq("accountId", self);
      return args.before === undefined
        ? account
        : account.lt("lastReplyAt", args.before);
    })
    .order("desc");
  const found: Found[] = [];
  let scanned = 0;
  for await (const member of memberships) {
    scanned += 1;
    if (member.conversationId === args.conversationId && isFollowing(member)) {
      const row = await threadRow(ctx, member.threadId);
      if (row !== null) found.push({ member, row });
    }
    if (found.length > limit) return { found, hasMore: true };
    // Too many of the caller's threads are elsewhere; say there may be more.
    if (scanned >= MAX_MEMBERSHIPS_SCANNED) return { found, hasMore: true };
  }
  return { found, hasMore: false };
}

/**
 * The threads whose original or replies match `search`: the most relevant
 * matching messages, each turned into its thread, then newest reply first.
 */
async function searchedThreads(
  ctx: QueryCtx,
  self: string,
  args: Args,
  search: string,
) {
  const matches = await ctx.db
    .query("messages")
    .withSearchIndex("search_body", (index) =>
      index.search("body", search).eq("conversationId", args.conversationId),
    )
    .take(MAX_SEARCH_MATCHES);
  const threadIds = new Set(
    matches.map((message) => message.threadId ?? message.messageId),
  );
  const found = await Promise.all(
    [...threadIds].map(async (threadId): Promise<Found | null> => {
      const row = await threadRow(ctx, threadId);
      if (row?.conversationId !== args.conversationId) return null;
      if (args.before !== undefined && row.lastReplyAt >= args.before) {
        return null;
      }
      return { member: await threadMember(ctx, threadId, self), row };
    }),
  );
  return found
    .filter((item): item is Found => item !== null)
    .filter(({ member }) => args.mine !== true || isFollowing(member))
    .sort((left, right) => right.row.lastReplyAt - left.row.lastReplyAt);
}

function isFollowing(member: Doc<"threadMembers"> | null) {
  return member !== null && member.unfollowed !== true;
}

/**
 * One page of a conversation's threads that have replies here, newest
 * reply first: every one, the caller's (`mine`), or those matching
 * `search`. With the conversation's member addresses, so the client also
 * asks every member's PDS.
 */
export async function threads(ctx: QueryCtx, self: string, args: Args) {
  const { conversation } = await requireAccess(ctx, args.conversationId, self);
  const limit = Math.max(
    1,
    Math.min(Math.floor(args.limit ?? THREAD_PAGE_SIZE), THREAD_PAGE_SIZE),
  );
  const search = (args.search ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
  let page: { found: Found[]; hasMore: boolean };
  if (search.length > 0) {
    const found = await searchedThreads(ctx, self, args, search);
    page = { found, hasMore: found.length > limit };
  } else if (args.mine === true) {
    page = await followedThreads(ctx, self, args, limit);
  } else {
    page = await everyThread(ctx, self, args, limit);
  }
  return {
    page: {
      hasMore: page.hasMore,
      threads: await Promise.all(
        page.found
          .slice(0, limit)
          .map(({ member, row }) => toListing(ctx, self, row, member)),
      ),
    },
    routes: await memberAddresses(ctx, conversation),
  };
}

/**
 * The threads the caller follows, newest reply first, leaving out muted
 * conversations (and muted spaces' channels) and channels left out of the
 * inbox, as `activity` does. Only this PDS's threads are listed.
 */
export async function inboxThreads(ctx: QueryCtx, self: string) {
  const accessTo = accessFinder(ctx, self);
  const describe = conversationDescriber(ctx);
  const memberships = ctx.db
    .query("threadMembers")
    .withIndex("by_account_reply", (index) => index.eq("accountId", self))
    .order("desc");
  const shown: Promise<InboxThread | null>[] = [];
  let scanned = 0;
  for await (const member of memberships) {
    scanned += 1;
    if (member.unfollowed !== true) {
      const access = await accessTo(member.conversationId);
      if (access !== null && isHeard(access)) {
        shown.push(
          (async () => {
            const row = await threadRow(ctx, member.threadId);
            if (row === null) return null;
            const [listing, conversation, latest] = await Promise.all([
              toListing(ctx, self, row, member),
              describe(access.conversation),
              ctx.db
                .query("messages")
                .withIndex("by_thread_sent", (index) =>
                  index.eq("threadId", row.threadId),
                )
                .order("desc")
                .first(),
            ]);
            return {
              ...listing,
              conversation,
              latest: latest === null ? null : toMessage(latest),
            };
          })(),
        );
      }
    }
    if (shown.length >= MAX_INBOX_THREADS) break;
    if (scanned >= MAX_MEMBERSHIPS_SCANNED) break;
  }
  return (await Promise.all(shown)).filter(
    (item): item is InboxThread => item !== null,
  );
}
