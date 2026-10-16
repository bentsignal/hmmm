import assert from "node:assert/strict";
import test from "node:test";
import type { TestContext } from "node:test";

import { fakeCtx } from "./fakeCtx.ts";
import { inboxThreads, threads } from "./threadLists.ts";
import {
  addReply,
  markThreadRead,
  replyTo,
  setThreadFollowed,
} from "./threads.ts";

const ME = "me@vera.chat";
const MAYA = "maya@vera.chat";
const LEO = "leo@vera.chat";
const GROUP = "group:vera.chat:1";
const MUTED = "group:vera.chat:2";
const HOUR = 60 * 60 * 1000;
const NOW = 30 * 24 * HOUR;

function setup(t: TestContext) {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const fake = fakeCtx({
    conversations: [GROUP, MUTED].map((conversationId) => ({
      conversationId,
      createdBy: ME,
      kind: "group",
      name: conversationId === GROUP ? "Weekend crew" : "Muted",
      updatedAt: 0,
    })),
    members: [GROUP, MUTED].flatMap((conversationId) =>
      [ME, MAYA, LEO].map((accountId) => ({
        accountId,
        conversationId,
        lastReadAt: 0,
        muted: accountId === ME && conversationId === MUTED,
        role: "member",
      })),
    ),
  });
  /** Stores a message as `send` does, a minute after the last one. */
  async function say(
    author: string,
    messageId: string,
    {
      body,
      conversationId = GROUP,
      threadId,
    }: Partial<Record<"body" | "conversationId" | "threadId", string>> = {},
  ) {
    t.mock.timers.tick(60_000);
    const sentAt = Date.now();
    const reply =
      threadId === undefined
        ? undefined
        : await replyTo(fake.ctx, conversationId, threadId);
    await fake.ctx.db.insert("messages", {
      attachments: [],
      authorId: author,
      authorName: author,
      body: body ?? messageId,
      conversationId,
      messageId,
      quote: reply?.quote,
      sentAt,
      threadId: reply?.threadId,
      threadOnly: reply?.threadOnly,
    });
    if (reply !== undefined) {
      await addReply(fake.ctx, { ...reply, authorId: author, sentAt });
    }
    return sentAt;
  }
  return { ...fake, say };
}

function ids(page: { threads: readonly { threadId: string }[] }) {
  return page.threads.map(({ threadId }) => threadId);
}

void test("lists a conversation's threads, newest reply first", async (t) => {
  const { ctx, say } = setup(t);
  await say(ME, "mine");
  await say(MAYA, "hers");
  await say(MAYA, "lonely");
  await say(LEO, "a", { threadId: "mine" });
  await say(LEO, "b", { threadId: "hers" });
  await say(MAYA, "c", { threadId: "mine" });
  const all = await threads(ctx, ME, { conversationId: GROUP });
  // A message without replies isn't a thread.
  assert.deepEqual(ids(all.page), ["mine", "hers"]);
  assert.equal(all.page.hasMore, false);
  assert.deepEqual([...all.routes].sort(), [LEO, MAYA, ME]);
  const [mine, hers] = all.page.threads;
  assert.ok(mine !== undefined && hers !== undefined);
  assert.equal(mine.root?.messageId, "mine");
  assert.equal(mine.replyCount, 2);
  assert.deepEqual(mine.repliers, [MAYA, LEO]);
  assert.equal(mine.following, true);
  // The first reply shows in the conversation; only the second is unread.
  assert.equal(mine.unreadCount, 1);
  assert.equal(hers.following, false);
  assert.equal(hers.lastReadAt, null);
  assert.equal(hers.unreadCount, 0);

  const yours = await threads(ctx, ME, { conversationId: GROUP, mine: true });
  assert.deepEqual(ids(yours.page), ["mine"]);
});

void test("pages a conversation's threads with `limit` and `before`", async (t) => {
  const { ctx, say } = setup(t);
  for (const id of ["one", "two", "three"]) {
    await say(MAYA, id);
    await say(LEO, `${id} reply`, { threadId: id });
  }
  const first = await threads(ctx, ME, { conversationId: GROUP, limit: 2 });
  assert.deepEqual(ids(first.page), ["three", "two"]);
  assert.equal(first.page.hasMore, true);
  const next = await threads(ctx, ME, {
    before: first.page.threads.at(-1)?.lastReplyAt,
    conversationId: GROUP,
    limit: 2,
  });
  assert.deepEqual(ids(next.page), ["one"]);
  assert.equal(next.page.hasMore, false);
});

void test("searches the text of a thread's original and replies", async (t) => {
  const { ctx, say } = setup(t);
  await say(MAYA, "lake", { body: "Who's in for the lake?" });
  await say(MAYA, "brunch", { body: "Brunch on Sunday" });
  await say(MAYA, "lunch", { body: "Lunch at the lake?" });
  await say(LEO, "a", { body: "I'm in", threadId: "lake" });
  await say(ME, "b", { body: "Pancakes please", threadId: "brunch" });
  function search(text: string, mine?: boolean) {
    return threads(ctx, ME, { conversationId: GROUP, mine, search: text });
  }
  // "lunch" has no replies, so it isn't a thread.
  assert.deepEqual(ids((await search("lake")).page), ["lake"]);
  assert.deepEqual(ids((await search("pancakes")).page), ["brunch"]);
  assert.deepEqual(ids((await search("lake pancakes")).page), [
    "brunch",
    "lake",
  ]);
  assert.deepEqual(ids((await search("lake pancakes", true)).page), ["brunch"]);
  // A blank search lists every thread.
  assert.deepEqual(ids((await search("  ")).page), ["brunch", "lake"]);
});

void test("the inbox lists the threads you follow outside muted conversations", async (t) => {
  const { ctx, say } = setup(t);
  await say(ME, "mine");
  await say(MAYA, "hers");
  await say(ME, "muted", { conversationId: MUTED });
  await say(MAYA, "a", { threadId: "mine" });
  await say(LEO, "b", { threadId: "mine" });
  await say(LEO, "c", { threadId: "hers" });
  await say(MAYA, "d", { conversationId: MUTED, threadId: "muted" });
  const listed = await inboxThreads(ctx, ME);
  assert.deepEqual(
    listed.map(({ threadId }) => threadId),
    ["mine"],
  );
  const [mine] = listed;
  assert.ok(mine !== undefined);
  assert.equal(mine.conversation.name, "Weekend crew");
  assert.equal(mine.latest?.messageId, "b");
  assert.equal(mine.unreadCount, 1);

  // Replying puts you in a thread, read through your reply.
  const repliedAt = await say(ME, "e", { threadId: "hers" });
  const after = await inboxThreads(ctx, ME);
  assert.deepEqual(
    after.map(({ threadId }) => threadId),
    ["hers", "mine"],
  );
  assert.equal(after.at(0)?.lastReadAt, repliedAt);
  assert.equal(after.at(0)?.unreadCount, 0);

  // Reading a thread clears its unread replies.
  await markThreadRead(ctx, ME, {
    conversationId: GROUP,
    readAt: Date.now(),
    threadId: "mine",
  });
  assert.equal((await inboxThreads(ctx, ME)).at(1)?.unreadCount, 0);
});

void test("turning a thread's bell off takes it out of your threads", async (t) => {
  const { ctx, say } = setup(t);
  await say(ME, "mine");
  await say(MAYA, "a", { threadId: "mine" });
  await setThreadFollowed(ctx, ME, {
    conversationId: GROUP,
    followed: false,
    threadId: "mine",
  });
  assert.deepEqual(await inboxThreads(ctx, ME), []);
  const yours = await threads(ctx, ME, { conversationId: GROUP, mine: true });
  assert.deepEqual(ids(yours.page), []);
  const all = await threads(ctx, ME, { conversationId: GROUP });
  assert.equal(all.page.threads.at(0)?.following, false);
});

void test("only members see a conversation's threads", async (t) => {
  const { ctx } = setup(t);
  await assert.rejects(
    threads(ctx, "stranger@vera.chat", { conversationId: GROUP }),
    /CONVERSATION_NOT_FOUND/,
  );
});
