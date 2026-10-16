import assert from "node:assert/strict";
import test from "node:test";

import { fakeCtx } from "./fakeCtx.ts";
import {
  notificationSettings,
  setNotificationSettings,
  setSpaceMuted,
  wantsPush,
} from "./settings.ts";

const ME = "me@vera.chat";

void test("every kind of push is on until turned off", async () => {
  const { ctx } = fakeCtx({});
  assert.deepEqual(await notificationSettings(ctx, ME), {
    channels: true,
    directMessages: true,
    enabled: true,
    groups: true,
    invites: true,
    reactions: true,
    replies: true,
    threadReplies: true,
  });
  assert.equal(await wantsPush(ctx, ME, "reactions"), true);
});

void test("turns one kind off, leaving the rest", async () => {
  const { ctx } = fakeCtx({});
  await setNotificationSettings(ctx, ME, { reactions: false });
  await setNotificationSettings(ctx, ME, { groups: false });
  assert.equal(await wantsPush(ctx, ME, "reactions"), false);
  assert.equal(await wantsPush(ctx, ME, "groups"), false);
  assert.equal(await wantsPush(ctx, ME, "directMessages"), true);
  await setNotificationSettings(ctx, ME, { reactions: true });
  assert.equal(await wantsPush(ctx, ME, "reactions"), true);
});

void test("turning pushes off silences every kind", async () => {
  const { ctx } = fakeCtx({});
  await setNotificationSettings(ctx, ME, { enabled: false });
  assert.equal(await wantsPush(ctx, ME, "directMessages"), false);
  assert.equal(await wantsPush(ctx, ME, "invites"), false);
  // Each kind keeps its own setting for when pushes come back.
  assert.equal((await notificationSettings(ctx, ME)).directMessages, true);
});

void test("mutes and unmutes a space you're in", async () => {
  const { ctx, rows } = fakeCtx({
    spaceMembers: [{ accountId: ME, role: "member", spaceId: "space:1" }],
  });
  await setSpaceMuted(ctx, ME, { muted: true, spaceId: "space:1" });
  assert.equal(rows("spaceMembers")[0]?.muted, true);
  await setSpaceMuted(ctx, ME, { muted: false, spaceId: "space:1" });
  assert.equal(rows("spaceMembers")[0]?.muted, undefined);
  await assert.rejects(
    setSpaceMuted(ctx, ME, { muted: true, spaceId: "space:other" }),
  );
});
