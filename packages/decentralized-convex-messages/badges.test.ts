import assert from "node:assert/strict";
import test from "node:test";
import type { TestContext } from "node:test";

import { badgeCount } from "./badges.ts";
import { fakeCtx } from "./fakeCtx.ts";

const ME = "me@vera.chat";
const FRIEND = "friend@vera.chat";
const HOUR = 60 * 60 * 1000;
const NOW = 30 * 24 * HOUR;

function message(conversationId: string, authorId: string, sentAt: number) {
  return {
    attachments: [],
    authorId,
    authorName: authorId,
    body: "hi",
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

function conversation(conversationId: string, kind: string, spaceId?: string) {
  return {
    conversationId,
    createdBy: FRIEND,
    kind,
    spaceId,
    updatedAt: 0,
  };
}

function at(t: TestContext) {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
}

void test("counts activity not yet seen, not messages", async (t) => {
  at(t);
  const { ctx } = fakeCtx({
    activitySightings: [
      // Seen through its newest message.
      {
        accountId: ME,
        key: "messages:direct:seen",
        seenAt: NOW - HOUR,
        through: NOW - 2 * HOUR,
      },
    ],
    conversations: [
      conversation("direct:a", "direct"),
      conversation("direct:seen", "direct"),
      conversation("group:muted", "group"),
    ],
    members: [
      member("direct:a"),
      member("direct:seen"),
      member("group:muted", { muted: true }),
    ],
    messages: [
      // Three new in one conversation count once.
      message("direct:a", FRIEND, NOW - 3 * HOUR),
      message("direct:a", FRIEND, NOW - 2 * HOUR),
      message("direct:a", FRIEND, NOW - HOUR),
      message("direct:seen", FRIEND, NOW - 2 * HOUR),
      // Muted conversations don't count.
      message("group:muted", FRIEND, NOW - HOUR),
    ],
  });
  assert.equal(await badgeCount(ctx, ME, { threads: true }), 1);
});

void test("ignores your own messages", async (t) => {
  at(t);
  const { ctx } = fakeCtx({
    conversations: [conversation("direct:a", "direct")],
    members: [member("direct:a")],
    messages: [
      message("direct:a", ME, NOW - 2 * HOUR),
      message("direct:a", ME, NOW - HOUR),
    ],
  });
  assert.equal(await badgeCount(ctx, ME, { threads: true }), 0);
});

void test("counts channels shown in the inbox", async (t) => {
  at(t);
  const { ctx } = fakeCtx({
    conversations: [
      conversation("channel:general", "channel", "space:1"),
      conversation("channel:hidden", "channel", "space:1"),
      conversation("channel:other", "channel", "space:2"),
    ],
    members: [member("channel:hidden", { hiddenFromInbox: true })],
    messages: [
      message("channel:general", FRIEND, NOW - HOUR),
      message("channel:hidden", FRIEND, NOW - HOUR),
      // Not your space.
      message("channel:other", FRIEND, NOW - HOUR),
    ],
    spaceMembers: [{ accountId: ME, role: "member", spaceId: "space:1" }],
    spaces: [{ createdBy: FRIEND, name: "One", spaceId: "space:1" }],
  });
  assert.equal(await badgeCount(ctx, ME, { threads: true }), 1);
});

void test("counts new reactions to your messages", async (t) => {
  at(t);
  const { ctx } = fakeCtx({
    conversations: [conversation("direct:a", "direct")],
    members: [member("direct:a")],
    messages: [
      { ...message("direct:a", ME, NOW - 2 * HOUR), messageId: "mine" },
    ],
    reactions: [
      {
        accountId: FRIEND,
        conversationId: "direct:a",
        emoji: "❤️",
        messageAuthorId: ME,
        messageId: "mine",
        reactedAt: NOW - HOUR,
      },
    ],
  });
  assert.equal(await badgeCount(ctx, ME, { threads: true }), 1);
});

void test("adds pending invitations to spaces that still exist", async (t) => {
  at(t);
  const { ctx } = fakeCtx({
    spaceInvites: [
      { accountId: ME, invitedBy: FRIEND, spaceId: "space:1" },
      { accountId: ME, invitedBy: FRIEND, spaceId: "space:2" },
      // Deleted space.
      { accountId: ME, invitedBy: FRIEND, spaceId: "space:gone" },
      { accountId: FRIEND, invitedBy: ME, spaceId: "space:1" },
    ],
    spaces: [
      { createdBy: FRIEND, name: "One", spaceId: "space:1" },
      { createdBy: FRIEND, name: "Two", spaceId: "space:2" },
    ],
  });
  assert.equal(await badgeCount(ctx, ME, { threads: true }), 2);
});

void test("is zero with nothing waiting", async (t) => {
  at(t);
  assert.equal(await badgeCount(fakeCtx({}).ctx, ME, { threads: true }), 0);
});
