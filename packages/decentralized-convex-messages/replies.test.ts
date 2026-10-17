import assert from "node:assert/strict";
import test from "node:test";
import type { TestContext } from "node:test";

import { activity, isUnseen } from "./activity.ts";
import { fakeCtx } from "./fakeCtx.ts";
import { seeConversationActivity } from "./sightings.ts";

// Activity about you: replies to your messages, and no conversations.

const ME = "me@vera.chat";
const MAYA = "maya@vera.chat";
const LEO = "leo@vera.chat";
const HOUR = 60 * 60 * 1000;
const NOW = 30 * 24 * HOUR;

function message(conversationId: string, authorId: string, sentAt: number) {
  return {
    attachments: [],
    authorId,
    authorName: authorId,
    body: `${authorId} at ${sentAt}`,
    conversationId,
    messageId: `${conversationId}:${sentAt}`,
    sentAt,
  };
}

function member(conversationId: string, extra = {}) {
  return {
    accountId: ME,
    conversationId,
    lastReadAt: 0,
    muted: false,
    role: "member",
    ...extra,
  };
}

function conversation(conversationId: string, kind: string) {
  return { conversationId, createdBy: MAYA, kind, updatedAt: 0 };
}

function at(t: TestContext, now: number) {
  t.mock.timers.enable({ apis: ["Date"], now });
}

/** A reply by `authorId` to my message `mine`, sent in its conversation. */
function replyToMe(
  conversationId: string,
  authorId: string,
  sentAt: number,
  extra = {},
) {
  return {
    ...message(conversationId, authorId, sentAt),
    quote: { authorId: ME, body: "mine" },
    threadId: "mine",
    ...extra,
  };
}

void test("about you, lists replies to your messages instead of conversations", async (t) => {
  at(t, NOW);
  const { ctx } = fakeCtx({
    conversations: [
      conversation("group:b", "group"),
      conversation("direct:a", "direct"),
    ],
    members: [member("group:b"), member("direct:a")],
    mentions: [
      {
        accountId: ME,
        conversationId: "group:b",
        messageId: "group:b:mentions",
        sentAt: NOW - HOUR,
      },
    ],
    messages: [
      { ...message("group:b", ME, NOW - 6 * HOUR), messageId: "mine" },
      // Others' messages are the Inbox's.
      message("group:b", LEO, NOW - 5 * HOUR),
      message("direct:a", MAYA, NOW - 5 * HOUR),
      replyToMe("group:b", MAYA, NOW - 4 * HOUR),
      // A direct message is all to you already.
      replyToMe("direct:a", MAYA, NOW - 3 * HOUR),
      // Kept in its thread: the thread's item has it.
      replyToMe("group:b", LEO, NOW - 2 * HOUR, { threadOnly: true }),
      // It mentions you too, so its mention shows instead.
      {
        ...replyToMe("group:b", LEO, NOW - HOUR),
        mentions: [{ accountId: ME, name: "me" }],
        messageId: "group:b:mentions",
      },
      replyToMe("group:b", ME, NOW - HOUR / 2),
    ],
  });
  const items = await activity(ctx, ME, { aboutYou: true, mentions: true });
  assert.deepEqual(
    items.map(({ key, kind }) => [kind, key]),
    [
      ["mention", "mention:group:b:mentions"],
      ["reply", `reply:group:b:${NOW - 4 * HOUR}`],
    ],
  );
  // Apps from before still get conversations.
  assert.deepEqual(
    (await activity(ctx, ME, { mentions: true })).map(({ kind }) => kind),
    ["mention", "messages", "messages"],
  );
});

void test("a reply in a thread whose bell is off doesn't show", async (t) => {
  at(t, NOW);
  const { ctx } = fakeCtx({
    conversations: [conversation("group:b", "group")],
    members: [member("group:b")],
    messages: [replyToMe("group:b", MAYA, NOW - HOUR)],
    threadMembers: [
      {
        accountId: ME,
        conversationId: "group:b",
        lastReadAt: 0,
        lastReplyAt: NOW - HOUR,
        threadId: "mine",
        unfollowed: true,
      },
    ],
  });
  assert.deepEqual(await activity(ctx, ME, { aboutYou: true }), []);
});

void test("a muted conversation's replies don't show", async (t) => {
  at(t, NOW);
  const { ctx } = fakeCtx({
    conversations: [conversation("group:b", "group")],
    members: [member("group:b", { alerts: "none" })],
    messages: [replyToMe("group:b", MAYA, NOW - HOUR)],
  });
  assert.deepEqual(await activity(ctx, ME, { aboutYou: true }), []);
});

void test("reading a conversation sees the replies to you in it", async (t) => {
  at(t, NOW);
  const { ctx } = fakeCtx({
    conversations: [conversation("group:b", "group")],
    members: [member("group:b")],
    messages: [
      replyToMe("group:b", MAYA, NOW - 2 * HOUR),
      replyToMe("group:b", LEO, NOW - HOUR),
    ],
  });
  await seeConversationActivity(ctx, ME, "group:b", NOW - 2 * HOUR);
  const items = await activity(ctx, ME, { aboutYou: true });
  assert.deepEqual(
    items.map((item) => [item.key, isUnseen(item)]),
    [
      [`reply:group:b:${NOW - HOUR}`, true],
      [`reply:group:b:${NOW - 2 * HOUR}`, false],
    ],
  );
});
