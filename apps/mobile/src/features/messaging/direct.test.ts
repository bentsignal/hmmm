import assert from "node:assert/strict";
import { test } from "node:test";
import { directConversationId } from "@decentralized-convex/messages";

import { directConversation } from "./direct.ts";

void test("a direct conversation's members are known from its ID", () => {
  const id = directConversationId("maya@vera.chat", "leo@example.com");
  assert.deepEqual(directConversation(id), {
    kind: "direct",
    members: ["leo@example.com", "maya@vera.chat"],
    name: null,
  });
});

void test("other IDs name no members", () => {
  assert.equal(directConversation("group:vera.chat:1234"), undefined);
  assert.equal(directConversation("direct:a@x"), undefined);
  // Not one directConversationId makes: its members are out of order.
  assert.equal(directConversation("direct:b@x:a@x"), undefined);
});
