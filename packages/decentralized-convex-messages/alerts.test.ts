import assert from "node:assert/strict";
import test from "node:test";

import {
  alerts,
  alertsOf,
  setAlerts,
  setMuted,
  setSpaceAlerts,
  setSpaceMuted,
} from "./alerts.ts";
import { fakeCtx } from "./fakeCtx.ts";
import { setNotificationSettings } from "./settings.ts";

const ME = "me@vera.chat";
const MAYA = "maya@vera.chat";

function conversation(conversationId: string, kind: string, spaceId?: string) {
  return { conversationId, createdBy: MAYA, kind, spaceId, updatedAt: 0 };
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

function chats(extra: Record<string, Record<string, unknown>[]> = {}) {
  return fakeCtx({
    conversations: [
      conversation("direct:a", "direct"),
      conversation("group:b", "group"),
      conversation("channel:c", "channel", "space:1"),
    ],
    members: [member("direct:a"), member("group:b")],
    spaceMembers: [{ accountId: ME, role: "member", spaceId: "space:1" }],
    ...extra,
  });
}

void test("everything alerts until you choose otherwise", async () => {
  const { ctx } = chats();
  assert.equal(await alertsOf(ctx, "direct:a", ME), "all");
  assert.equal(await alertsOf(ctx, "group:b", ME), "all");
  assert.equal(await alertsOf(ctx, "channel:c", ME), "all");
  assert.equal(await alertsOf(ctx, "group:b", MAYA), null);
});

void test("a group follows your groups default until it has its own choice", async () => {
  const { ctx, rows } = chats();
  await setNotificationSettings(ctx, ME, { groupAlerts: "mentions" });
  assert.equal(await alertsOf(ctx, "group:b", ME), "mentions");
  await setAlerts(ctx, ME, { alerts: "all", conversationId: "group:b" });
  assert.equal(await alertsOf(ctx, "group:b", ME), "all");
  await setNotificationSettings(ctx, ME, { groupAlerts: "none" });
  assert.equal(await alertsOf(ctx, "group:b", ME), "all");

  // Choosing the default follows it again.
  await setAlerts(ctx, ME, { alerts: "none", conversationId: "group:b" });
  const group = rows("members").find((row) => row.conversationId === "group:b");
  assert.equal(group?.alerts, undefined);
  assert.equal(group?.muted, false);
  await setNotificationSettings(ctx, ME, { groupAlerts: "all" });
  assert.equal(await alertsOf(ctx, "group:b", ME), "all");
});

void test("a channel's choice wins over its space's, and the space's over the default", async () => {
  const { ctx } = chats();
  await setNotificationSettings(ctx, ME, { channelAlerts: "none" });
  assert.equal(await alertsOf(ctx, "channel:c", ME), "none");
  await setSpaceAlerts(ctx, ME, { alerts: "mentions", spaceId: "space:1" });
  assert.equal(await alertsOf(ctx, "channel:c", ME), "mentions");
  await setAlerts(ctx, ME, { alerts: "all", conversationId: "channel:c" });
  assert.equal(await alertsOf(ctx, "channel:c", ME), "all");
  await setSpaceAlerts(ctx, ME, { alerts: "none", spaceId: "space:1" });
  assert.equal(await alertsOf(ctx, "channel:c", ME), "all");
});

void test("direct messages alert about everything or nothing", async () => {
  const { ctx } = chats();
  await assert.rejects(
    setAlerts(ctx, ME, { alerts: "mentions", conversationId: "direct:a" }),
  );
  await setMuted(ctx, ME, { conversationId: "direct:a", muted: true });
  assert.equal(await alertsOf(ctx, "direct:a", ME), "none");
  await setMuted(ctx, ME, { conversationId: "direct:a", muted: false });
  assert.equal(await alertsOf(ctx, "direct:a", ME), "all");
});

void test("muting from before alert levels means none", async () => {
  const { ctx } = chats({
    conversations: [
      conversation("group:b", "group"),
      conversation("channel:c", "channel", "space:1"),
    ],
    members: [member("group:b", { muted: true })],
    spaceMembers: [
      { accountId: ME, muted: true, role: "member", spaceId: "space:1" },
    ],
  });
  assert.equal(await alertsOf(ctx, "group:b", ME), "none");
  assert.equal(await alertsOf(ctx, "channel:c", ME), "none");
});

void test("turning alerts back on starts clean", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: 5000 });
  const { ctx, rows } = chats();
  await setAlerts(ctx, ME, { alerts: "none", conversationId: "group:b" });
  await setAlerts(ctx, ME, { alerts: "mentions", conversationId: "group:b" });
  const group = rows("members").find((row) => row.conversationId === "group:b");
  assert.equal(group?.alertsSince, 5000);
  await setSpaceMuted(ctx, ME, { muted: true, spaceId: "space:1" });
  assert.equal(rows("spaceMembers")[0]?.muted, true);
  await setSpaceMuted(ctx, ME, { muted: false, spaceId: "space:1" });
  assert.equal(rows("spaceMembers")[0]?.muted, undefined);
  assert.equal(rows("spaceMembers")[0]?.alertsSince, 5000);
  await assert.rejects(
    setSpaceMuted(ctx, ME, { muted: true, spaceId: "space:other" }),
  );
});

void test("at mentions, only a message that mentions you alerts", () => {
  const mentioned = { mentions: [{ accountId: ME, name: "Me" }] };
  assert.equal(alerts("all", {}, ME), true);
  assert.equal(alerts("mentions", {}, ME), false);
  assert.equal(alerts("mentions", mentioned, ME), true);
  assert.equal(alerts("mentions", mentioned, MAYA), false);
  assert.equal(alerts("none", mentioned, ME), false);
});
