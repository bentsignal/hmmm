import assert from "node:assert/strict";
import test from "node:test";
import type { TestContext } from "node:test";

import { activity } from "./activity.ts";
import { fakeCtx } from "./fakeCtx.ts";
import { olderThan } from "./paging.ts";
import {
  addReply,
  markThreadRead,
  replyTo,
  setThreadFollowed,
  thread,
  threadState,
  threadSummaries,
} from "./threads.ts";

const ME = "me@vera.chat";
const MAYA = "maya@vera.chat";
const LEO = "leo@vera.chat";
const GROUP = "group:vera.chat:1";
const HOUR = 60 * 60 * 1000;
const NOW = 30 * 24 * HOUR;

function setup(t: TestContext) {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const fake = fakeCtx({
    conversations: [
      { conversationId: GROUP, createdBy: ME, kind: "group", updatedAt: 0 },
    ],
    members: [ME, MAYA, LEO].map((accountId) => ({
      accountId,
      conversationId: GROUP,
      lastReadAt: 0,
      muted: false,
      role: "member",
    })),
  });
  /**
   * Stores a message as `send` does, a minute after the last one. (`send`
   * itself schedules pushes, which these tests can't load.)
   */
  async function say(author: string, messageId: string, threadId?: string) {
    t.mock.timers.tick(60_000);
    const sentAt = Date.now();
    const reply =
      threadId === undefined
        ? undefined
        : await replyTo(fake.ctx, GROUP, threadId);
    const message = {
      attachments: [],
      authorId: author,
      authorName: author,
      body: `${messageId} from ${author}`,
      conversationId: GROUP,
      messageId,
      quote: reply?.quote,
      sentAt,
      threadId: reply?.threadId,
      threadOnly: reply?.threadOnly,
    };
    await fake.ctx.db.insert("messages", message);
    if (reply !== undefined) {
      await addReply(fake.ctx, { ...reply, authorId: author, sentAt });
    }
    return message;
  }
  return { ...fake, say };
}

void test("a thread's first reply shows in the conversation, later ones don't", async (t) => {
  const { ctx, say } = setup(t);
  await say(ME, "root");
  const first = await say(MAYA, "first", "root");
  const second = await say(LEO, "second", "root");
  assert.equal(first.threadOnly, undefined);
  assert.equal(second.threadOnly, true);
  assert.deepEqual(first.quote, {
    attachment: undefined,
    authorId: ME,
    body: "root from me@vera.chat",
  });

  const shown = await olderThan(ctx, { conversationId: GROUP }, undefined);
  assert.deepEqual(
    shown.messages.map(({ messageId }) => messageId),
    ["root", "first"],
  );
  const page = await thread(ctx, ME, {
    conversationId: GROUP,
    threadId: "root",
  });
  assert.equal(page.page.root?.messageId, "root");
  assert.deepEqual(
    page.page.messages.map(({ messageId }) => messageId),
    ["first", "second"],
  );
});

void test("a reply to a reply goes to the original's thread", async (t) => {
  const { say } = setup(t);
  await say(ME, "root");
  await say(MAYA, "first", "root");
  const nested = await say(LEO, "nested", "first");
  assert.equal(nested.threadId, "root");
  assert.equal(nested.threadOnly, true);
});

void test("summarizes threads and tracks who's in them", async (t) => {
  const { ctx, say } = setup(t);
  await say(ME, "root");
  await say(MAYA, "first", "root");
  await say(LEO, "second", "root");
  await say(MAYA, "third", "root");
  const { summaries } = await threadSummaries(ctx, ME, {
    conversationId: GROUP,
    messageIds: ["root", "first"],
  });
  assert.deepEqual(summaries, [
    {
      lastReplyAt: NOW + 4 * 60_000,
      replyCount: 3,
      repliers: [MAYA, LEO],
      threadId: "root",
    },
  ]);
  // The original's author is in it without replying; others aren't.
  const state = await threadState(ctx, ME, {
    conversationId: GROUP,
    threadId: "root",
  });
  assert.deepEqual(state, { following: true, lastReadAt: NOW + 60_000 });
});

void test("activity lists replies after the first, until the thread is read", async (t) => {
  const { ctx, say } = setup(t);
  await say(ME, "root");
  await say(MAYA, "first", "root");
  await say(LEO, "second", "root");
  await say(MAYA, "third", "root");
  const items = await activity(ctx, ME, true);
  const item = items.find(({ kind }) => kind === "thread");
  assert.ok(item?.kind === "thread");
  assert.equal(item.count, 2);
  assert.deepEqual(item.authors, [MAYA, LEO]);
  assert.equal(item.root?.messageId, "root");
  // Apps from before threads don't ask for them.
  assert.equal(
    (await activity(ctx, ME)).some(({ kind }) => kind === "thread"),
    false,
  );

  await markThreadRead(ctx, ME, {
    conversationId: GROUP,
    readAt: item.at,
    threadId: "root",
  });
  const after = (await activity(ctx, ME, true)).find(
    ({ kind }) => kind === "thread",
  );
  assert.equal(after?.seenThrough, item.at);
});

void test("a thread's bell turns its activity off and back on", async (t) => {
  const { ctx, say } = setup(t);
  await say(ME, "root");
  await say(MAYA, "first", "root");
  await say(LEO, "second", "root");
  const args = { conversationId: GROUP, threadId: "root" };
  await setThreadFollowed(ctx, ME, { ...args, followed: false });
  assert.equal((await threadState(ctx, ME, args)).following, false);
  assert.equal(
    (await activity(ctx, ME, true)).some(({ kind }) => kind === "thread"),
    false,
  );
  await setThreadFollowed(ctx, ME, { ...args, followed: true });
  assert.equal((await threadState(ctx, ME, args)).following, true);
});

void test("anyone can follow a thread before it has replies", async (t) => {
  const { ctx, say } = setup(t);
  await say(MAYA, "root");
  const args = { conversationId: GROUP, threadId: "root" };
  assert.equal((await threadState(ctx, ME, args)).following, false);
  await setThreadFollowed(ctx, ME, { ...args, followed: true });
  assert.equal((await threadState(ctx, ME, args)).following, true);
});

void test("a reply must answer a message in its conversation", async (t) => {
  const { say } = setup(t);
  await assert.rejects(say(ME, "reply", "missing"), /MESSAGE_NOT_FOUND/);
});
