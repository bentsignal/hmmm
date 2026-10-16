import assert from "node:assert/strict";
import test from "node:test";
import type { TestContext } from "node:test";

import { activity } from "./activity.ts";
import { setAlerts } from "./alerts.ts";
import { badgeCount } from "./badges.ts";
import { fakeCtx } from "./fakeCtx.ts";
import { listeners } from "./listeners.ts";
import { recordMentions } from "./mentions.ts";
import { olderThan } from "./paging.ts";
import { seeConversationActivity } from "./sightings.ts";
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
  async function say(
    author: string,
    messageId: string,
    threadId?: string,
    mentions?: { accountId: string; name: string }[],
  ) {
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
      mentions,
      messageId,
      quote: reply?.quote,
      sentAt,
      threadId: reply?.threadId,
      threadOnly: reply?.threadOnly,
    };
    await fake.ctx.db.insert("messages", message);
    await recordMentions(fake.ctx, message);
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
  const items = await activity(ctx, ME, { threads: true });
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
  const after = (await activity(ctx, ME, { threads: true })).find(
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
    (await activity(ctx, ME, { threads: true })).some(
      ({ kind }) => kind === "thread",
    ),
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

void test("push badges count threads only for apps that show them", async (t) => {
  const { ctx, say } = setup(t);
  await say(ME, "root");
  await say(MAYA, "first", "root");
  await say(LEO, "second", "root");
  // The conversation's messages are one item; the thread is another.
  assert.equal(await badgeCount(ctx, ME, { threads: true }), 2);
  assert.equal(await badgeCount(ctx, ME, {}), 1);
});

void test("a mention in a thread reply is its own item, seen in the thread", async (t) => {
  const { ctx, say } = setup(t);
  await say(ME, "root");
  await say(MAYA, "first", "root");
  await say(LEO, "plain", "root");
  await say(LEO, "ping", "root", [{ accountId: ME, name: "Me" }]);
  const shows = { mentions: true, threads: true };
  const items = await activity(ctx, ME, shows);
  const mention = items.find(({ kind }) => kind === "mention");
  assert.equal(mention?.key, "mention:ping");
  const replies = items.find(({ kind }) => kind === "thread");
  assert.equal(replies?.kind === "thread" && replies.count, 1);
  // Apps that can't open threads don't list it.
  assert.equal(
    (await activity(ctx, ME, { mentions: true })).some(
      ({ kind }) => kind === "mention",
    ),
    false,
  );

  // Reading the conversation doesn't see it; reading the thread does.
  await seeConversationActivity(ctx, ME, GROUP, Date.now());
  const unread = (await activity(ctx, ME, shows)).find(
    ({ kind }) => kind === "mention",
  );
  assert.equal(unread?.seenThrough, undefined);
  await markThreadRead(ctx, ME, {
    conversationId: GROUP,
    readAt: Date.now(),
    threadId: "root",
  });
  const read = (await activity(ctx, ME, shows)).find(
    ({ kind }) => kind === "mention",
  );
  assert.notEqual(read?.seenThrough, undefined);
});

void test("a thread reply pushes to the thread and to whoever it mentions", async (t) => {
  const { ctx, say } = setup(t);
  await say(ME, "root");
  await say(MAYA, "first", "root");
  await say(MAYA, "ping", "root", [{ accountId: LEO, name: "Leo" }]);
  const [message, conversation] = await Promise.all([
    ctx.db
      .query("messages")
      .withIndex("by_message", (index) => index.eq("messageId", "ping"))
      .unique(),
    ctx.db
      .query("conversations")
      .withIndex("by_conversation", (index) =>
        index.eq("conversationId", GROUP),
      )
      .unique(),
  ]);
  assert.ok(message !== null && conversation !== null);
  const found = { conversation, message };
  function heard() {
    return listeners(ctx, found.message, found.conversation, [ME, MAYA, LEO]);
  }
  assert.deepEqual(await heard(), [
    { accountId: ME, reply: "yours" },
    { accountId: LEO, reply: "thread" },
  ]);
  // At mentions, the thread still reaches you; at none, nothing does.
  await setAlerts(ctx, ME, { alerts: "mentions", conversationId: GROUP });
  assert.equal((await heard()).length, 2);
  await setAlerts(ctx, ME, { alerts: "none", conversationId: GROUP });
  assert.deepEqual(await heard(), [{ accountId: LEO, reply: "thread" }]);
});
