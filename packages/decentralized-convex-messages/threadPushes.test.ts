import assert from "node:assert/strict";
import test from "node:test";

import { setAlerts } from "./alerts.ts";
import { listeners } from "./listeners.ts";
import { GROUP, LEO, MAYA, ME, setup } from "./threads.testing.ts";

/** Who hears about a stored message, and as what. */
async function heardOf(
  ctx: ReturnType<typeof setup>["ctx"],
  messageId: string,
) {
  const [message, conversation] = await Promise.all([
    ctx.db
      .query("messages")
      .withIndex("by_message", (index) => index.eq("messageId", messageId))
      .unique(),
    ctx.db
      .query("conversations")
      .withIndex("by_conversation", (index) =>
        index.eq("conversationId", GROUP),
      )
      .unique(),
  ]);
  assert.ok(message !== null && conversation !== null);
  return listeners(ctx, message, conversation, [ME, MAYA, LEO]);
}

void test("a thread reply pushes to the thread and to whoever it mentions", async (t) => {
  const { ctx, say } = setup(t);
  await say(ME, "root");
  await say(MAYA, "first", "root");
  await say(MAYA, "ping", "root", {
    mentions: [{ accountId: LEO, name: "Leo" }],
  });
  function heard() {
    return heardOf(ctx, "ping");
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

void test("a reply from the conversation reaches its thread's people it doesn't alert", async (t) => {
  const { ctx, say } = setup(t);
  await say(ME, "root");
  await say(MAYA, "kept", "root", { threadOnly: true });
  await say(LEO, "shown", "root", { threadOnly: false });
  // Everyone hears of it as a message, and the original's author as a reply.
  assert.deepEqual(await heardOf(ctx, "shown"), [
    { accountId: ME, reply: "yours" },
    { accountId: MAYA, reply: null },
  ]);
  // At mentions, Maya still hears of it, through the thread she's in.
  await setAlerts(ctx, MAYA, { alerts: "mentions", conversationId: GROUP });
  assert.deepEqual(await heardOf(ctx, "shown"), [
    { accountId: ME, reply: "yours" },
    { accountId: MAYA, reply: "thread" },
  ]);
});
