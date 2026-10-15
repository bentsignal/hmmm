import assert from "node:assert/strict";
import test from "node:test";
import type { TestContext } from "node:test";

import { activity, isUnseen } from "./activity.ts";
import { fakeCtx } from "./fakeCtx.ts";
import { markActivitySeen, seeConversationActivity } from "./sightings.ts";

const ME = "me@vera.chat";
const MAYA = "maya@vera.chat";
const LEO = "leo@vera.chat";
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = 30 * DAY;

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

function conversation(conversationId: string, kind: string, spaceId?: string) {
  return { conversationId, createdBy: MAYA, kind, spaceId, updatedAt: 0 };
}

function reaction(
  accountId: string,
  messageId: string,
  emoji: string,
  reactedAt: number,
) {
  return {
    accountId,
    conversationId: "direct:a",
    emoji,
    messageId,
    messageAuthorId: ME,
    reactedAt,
  };
}

function at(t: TestContext, now: number) {
  t.mock.timers.enable({ apis: ["Date"], now });
}

void test("lists others' messages, one item per conversation", async (t) => {
  at(t, NOW);
  const { ctx } = fakeCtx({
    conversations: [
      conversation("direct:a", "direct"),
      conversation("group:b", "group"),
      conversation("group:muted", "group"),
      conversation("direct:mine", "direct"),
    ],
    members: [
      member("direct:a"),
      member("group:b"),
      member("group:muted", { muted: true }),
      member("direct:mine"),
    ],
    messages: [
      message("direct:a", MAYA, NOW - 3 * HOUR),
      message("direct:a", ME, NOW - 2 * HOUR),
      message("group:b", MAYA, NOW - 5 * HOUR),
      message("group:b", LEO, NOW - 4 * HOUR),
      message("group:muted", MAYA, NOW - HOUR),
      message("direct:mine", ME, NOW - HOUR),
    ],
  });
  const items = await activity(ctx, ME);
  assert.deepEqual(
    items.map((item) => [
      item.key,
      item.at,
      item.kind === "messages" ? [item.count, item.authors] : null,
    ]),
    [
      ["messages:direct:a", NOW - 3 * HOUR, [1, [MAYA]]],
      ["messages:group:b", NOW - 4 * HOUR, [2, [LEO, MAYA]]],
    ],
  );
  assert.equal(items[0]?.seenAt, undefined);
});

void test("leaves out channels hidden from the inbox", async (t) => {
  at(t, NOW);
  const { ctx } = fakeCtx({
    conversations: [
      conversation("channel:general", "channel", "space:1"),
      conversation("channel:hidden", "channel", "space:1"),
    ],
    members: [member("channel:hidden", { hiddenFromInbox: true })],
    messages: [
      message("channel:general", MAYA, NOW - HOUR),
      message("channel:hidden", MAYA, NOW - HOUR),
    ],
    spaceMembers: [{ accountId: ME, role: "member", spaceId: "space:1" }],
    spaces: [{ createdBy: MAYA, name: "Lounge", spaceId: "space:1" }],
  });
  const items = await activity(ctx, ME);
  assert.deepEqual(
    items.map(({ conversation: { spaceName }, key }) => [key, spaceName]),
    [["messages:channel:general", "Lounge"]],
  );
});

void test("leaves out the channels of a muted space", async (t) => {
  at(t, NOW);
  const { ctx } = fakeCtx({
    conversations: [
      conversation("channel:quiet", "channel", "space:quiet"),
      conversation("direct:a", "direct"),
    ],
    members: [member("direct:a")],
    messages: [
      message("channel:quiet", MAYA, NOW - HOUR),
      message("direct:a", MAYA, NOW - HOUR),
    ],
    spaceMembers: [
      { accountId: ME, muted: true, role: "member", spaceId: "space:quiet" },
    ],
    spaces: [{ createdBy: MAYA, name: "Quiet", spaceId: "space:quiet" }],
  });
  const items = await activity(ctx, ME);
  assert.deepEqual(
    items.map(({ key }) => key),
    ["messages:direct:a"],
  );
});

void test("groups others' reactions to your messages by message", async (t) => {
  at(t, NOW);
  const mine = "direct:a:1000";
  const theirs = "direct:a:2000";
  const { ctx } = fakeCtx({
    conversations: [conversation("direct:a", "direct")],
    members: [member("direct:a")],
    messages: [
      { ...message("direct:a", ME, 1000), messageId: mine },
      { ...message("direct:a", MAYA, 2000), messageId: theirs },
    ],
    reactions: [
      reaction(MAYA, mine, "❤️", NOW - 2 * HOUR),
      reaction(LEO, mine, "😂", NOW - HOUR),
      // Your own reaction to your message isn't news.
      reaction(ME, mine, "👍", NOW - HOUR / 2),
      // Reactions to others' messages aren't yours to hear about.
      { ...reaction(LEO, theirs, "🔥", NOW), messageAuthorId: MAYA },
    ],
  });
  const items = await activity(ctx, ME);
  assert.equal(items.length, 1);
  const [item] = items;
  assert.equal(item?.kind, "reactions");
  assert.equal(item.key, `reactions:${mine}`);
  assert.equal(item.at, NOW - HOUR);
  assert.equal(item.message.messageId, mine);
  assert.deepEqual(
    item.reactions.map(({ accountId, emoji }) => [accountId, emoji]),
    [
      [LEO, "😂"],
      [MAYA, "❤️"],
    ],
  );
});

void test("an item stays a day after it's seen, then goes", async (t) => {
  at(t, NOW);
  const { ctx } = fakeCtx({
    conversations: [conversation("direct:a", "direct")],
    members: [member("direct:a")],
    messages: [message("direct:a", MAYA, NOW - HOUR)],
  });
  const key = "messages:direct:a";
  await markActivitySeen(ctx, ME, { items: [{ key, through: NOW - HOUR }] });
  const [seen] = await activity(ctx, ME);
  assert.equal(seen?.seenAt, NOW);
  assert.equal(seen.seenThrough, NOW - HOUR);

  // Seeing it again later doesn't keep it longer.
  t.mock.timers.setTime(NOW + 12 * HOUR);
  await markActivitySeen(ctx, ME, { items: [{ key, through: NOW - HOUR }] });
  assert.equal((await activity(ctx, ME)).length, 1);

  t.mock.timers.setTime(NOW + DAY);
  assert.deepEqual(await activity(ctx, ME), []);
});

void test("new activity in a seen item shows only what's new once the rest goes", async (t) => {
  at(t, NOW);
  const { ctx, rows } = fakeCtx({
    conversations: [conversation("direct:a", "direct")],
    members: [member("direct:a")],
    messages: [message("direct:a", MAYA, NOW - HOUR)],
  });
  const key = "messages:direct:a";
  await markActivitySeen(ctx, ME, { items: [{ key, through: NOW - HOUR }] });
  t.mock.timers.setTime(NOW + 2 * HOUR);
  await ctx.db.insert("messages", message("direct:a", LEO, NOW + 2 * HOUR));
  const [both] = await activity(ctx, ME);
  assert.equal(both?.kind === "messages" ? both.count : null, 2);
  assert.equal(both?.seenThrough, NOW - HOUR);

  await markActivitySeen(ctx, ME, {
    items: [{ key, through: NOW + 2 * HOUR }],
  });
  t.mock.timers.setTime(NOW + DAY);
  const [newer] = await activity(ctx, ME);
  assert.equal(newer?.kind === "messages" ? newer.count : null, 1);
  assert.equal(newer?.at, NOW + 2 * HOUR);

  t.mock.timers.setTime(NOW + 2 * HOUR + DAY);
  assert.deepEqual(await activity(ctx, ME), []);
  // A new sighting each time something new was seen, until they expire.
  assert.equal(rows("activitySightings").length, 2);
});

void test("drops sightings that can no longer hide anything", async (t) => {
  at(t, NOW);
  const { ctx, rows } = fakeCtx({});
  for (const offset of [0, 1, 2]) {
    t.mock.timers.setTime(NOW + offset * DAY);
    await markActivitySeen(ctx, ME, {
      items: [{ key: "messages:direct:a", through: NOW + offset * DAY }],
    });
  }
  // Of the two over a day old, only the newest still matters.
  assert.deepEqual(
    rows("activitySightings").map(({ seenAt }) => seenAt),
    [NOW + DAY, NOW + 2 * DAY],
  );
  t.mock.timers.setTime(NOW + 10 * DAY);
  await markActivitySeen(ctx, ME, {
    items: [{ key: "messages:direct:b", through: NOW + 10 * DAY }],
  });
  assert.deepEqual(
    rows("activitySightings").map(({ key }) => key),
    ["messages:direct:b"],
  );
});

void test("never shows activity older than a week", async (t) => {
  at(t, NOW);
  const { ctx } = fakeCtx({
    conversations: [conversation("direct:a", "direct")],
    members: [member("direct:a")],
    messages: [message("direct:a", MAYA, NOW - 8 * DAY)],
  });
  assert.deepEqual(await activity(ctx, ME), []);
});

void test("rejects bad sightings", async (t) => {
  at(t, NOW);
  const { ctx } = fakeCtx({});
  await assert.rejects(
    markActivitySeen(ctx, ME, { items: [{ key: "", through: NOW }] }),
  );
  await assert.rejects(
    markActivitySeen(ctx, ME, { items: [{ key: "a", through: Number.NaN }] }),
  );
});

void test("leaves out what came in while muted", async (t) => {
  at(t, NOW);
  const { ctx } = fakeCtx({
    conversations: [conversation("direct:a", "direct")],
    // Unmuted two hours ago.
    members: [member("direct:a", { alertsSince: NOW - 2 * HOUR })],
    messages: [
      message("direct:a", MAYA, NOW - 3 * HOUR),
      message("direct:a", MAYA, NOW - HOUR),
    ],
  });
  const [item] = await activity(ctx, ME);
  assert.equal(item?.kind === "messages" ? item.count : null, 1);
  assert.equal(item?.at, NOW - HOUR);
});

void test("reading a conversation sees its messages and reactions", async (t) => {
  at(t, NOW);
  const { ctx } = fakeCtx({
    conversations: [conversation("direct:a", "direct")],
    members: [member("direct:a")],
    messages: [
      { ...message("direct:a", ME, NOW - 3 * HOUR), messageId: "mine" },
      message("direct:a", MAYA, NOW - 2 * HOUR),
    ],
    reactions: [reaction(MAYA, "mine", "❤️", NOW - HOUR)],
  });
  assert.equal((await activity(ctx, ME)).filter(isUnseen).length, 2);
  await seeConversationActivity(ctx, ME, "direct:a", NOW - 2 * HOUR);
  const items = await activity(ctx, ME);
  assert.equal(items.length, 2);
  assert.equal(items.filter(isUnseen).length, 0);
});
