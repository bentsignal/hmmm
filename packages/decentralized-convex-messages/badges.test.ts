import assert from "node:assert/strict";
import test from "node:test";

import { badgeCount } from "./badges.ts";
import { fakeCtx } from "./fakeCtx.ts";

const ME = "me@vera.chat";
const FRIEND = "friend@vera.chat";

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

function member(conversationId: string, lastReadAt: number, extra = {}) {
  return {
    accountId: ME,
    conversationId,
    lastReadAt,
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

void test("counts conversations with unread messages, not messages", async () => {
  const { ctx } = fakeCtx({
    conversations: [
      conversation("direct:a", "direct"),
      conversation("direct:b", "direct"),
      conversation("group:c", "group"),
    ],
    members: [
      member("direct:a", 10),
      member("direct:b", 10),
      member("group:c", 10, { muted: true }),
    ],
    messages: [
      // Three unread in one conversation count once.
      message("direct:a", FRIEND, 11),
      message("direct:a", FRIEND, 12),
      message("direct:a", FRIEND, 13),
      // Read already.
      message("direct:b", FRIEND, 5),
      // Muted conversations still count, as in the inbox.
      message("group:c", FRIEND, 20),
    ],
  });
  assert.equal(await badgeCount(ctx, ME), 2);
});

void test("ignores your own messages", async () => {
  const { ctx } = fakeCtx({
    conversations: [conversation("direct:a", "direct")],
    members: [member("direct:a", 10)],
    messages: [message("direct:a", ME, 11), message("direct:a", ME, 12)],
  });
  assert.equal(await badgeCount(ctx, ME), 0);
});

void test("counts channels shown in the inbox", async () => {
  const { ctx } = fakeCtx({
    conversations: [
      conversation("channel:general", "channel", "space:1"),
      conversation("channel:hidden", "channel", "space:1"),
      conversation("channel:fresh", "channel", "space:1"),
      conversation("channel:other", "channel", "space:2"),
    ],
    // Read state is stored lazily: only the hidden channel has a row.
    members: [member("channel:hidden", 0, { hiddenFromInbox: true })],
    messages: [
      // Before joining the space, so already read.
      message("channel:general", FRIEND, 0),
      message("channel:hidden", FRIEND, 50),
      message("channel:fresh", FRIEND, 50),
      // Not your space.
      message("channel:other", FRIEND, 50),
    ],
    spaceMembers: [{ accountId: ME, role: "member", spaceId: "space:1" }],
    spaces: [{ createdBy: FRIEND, name: "One", spaceId: "space:1" }],
  });
  assert.equal(await badgeCount(ctx, ME), 1);
});

void test("adds pending invitations to spaces that still exist", async () => {
  const { ctx } = fakeCtx({
    conversations: [conversation("direct:a", "direct")],
    members: [member("direct:a", 0)],
    messages: [message("direct:a", FRIEND, 1)],
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
  assert.equal(await badgeCount(ctx, ME), 3);
});

void test("is zero with nothing waiting", async () => {
  assert.equal(await badgeCount(fakeCtx({}).ctx, ME), 0);
});
