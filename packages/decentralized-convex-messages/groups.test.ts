import assert from "node:assert/strict";
import test from "node:test";

import { addGroupMembers, conversation } from "./conversations.ts";
import { fakeCtx } from "./fakeCtx.ts";

const OWNER = "owner@vera.chat";
const MAYA = "maya@vera.chat";
const LEO = "leo@vera.chat";
const PRIYA = "priya@vera.chat";
const GROUP = "group:vera.chat:1";

function group(members: readonly string[]) {
  return fakeCtx({
    conversations: [
      { conversationId: GROUP, createdBy: OWNER, kind: "group", updatedAt: 0 },
    ],
    members: members.map((accountId) => ({
      accountId,
      conversationId: GROUP,
      lastReadAt: 0,
      muted: false,
      role: accountId === OWNER ? "owner" : "member",
    })),
  });
}

async function membersOf(fake: ReturnType<typeof group>, self: string) {
  const found = await conversation(fake.ctx, self, { conversationId: GROUP });
  return found?.members;
}

void test("any member adds people, who can then open the group", async () => {
  const fake = group([OWNER, MAYA]);
  await addGroupMembers(fake.ctx, MAYA, {
    conversationId: GROUP,
    members: [" Leo@vera.chat ", MAYA, OWNER],
  });
  assert.deepEqual(await membersOf(fake, LEO), [LEO, MAYA, OWNER]);
  // A new member adds people too.
  await addGroupMembers(fake.ctx, LEO, {
    conversationId: GROUP,
    members: [PRIYA],
  });
  assert.deepEqual(await membersOf(fake, OWNER), [LEO, MAYA, OWNER, PRIYA]);
  const added = fake.rows("members").find((row) => row.accountId === PRIYA);
  assert.equal(added?.role, "member");
});

void test("someone outside the group can't add people", async () => {
  const fake = group([OWNER, MAYA]);
  await assert.rejects(
    addGroupMembers(fake.ctx, LEO, { conversationId: GROUP, members: [PRIYA] }),
  );
  assert.equal(await membersOf(fake, PRIYA), undefined);
});

void test("a group holds at most 50 people", async () => {
  const fake = group(
    Array.from({ length: 49 }, (_, index) => `member${index}@vera.chat`),
  );
  await addGroupMembers(fake.ctx, "member0@vera.chat", {
    conversationId: GROUP,
    members: [LEO],
  });
  await assert.rejects(
    addGroupMembers(fake.ctx, "member0@vera.chat", {
      conversationId: GROUP,
      members: [PRIYA],
    }),
  );
});
