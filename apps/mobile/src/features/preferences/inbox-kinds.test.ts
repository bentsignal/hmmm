import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isDefaultInboxKinds,
  storedInboxKinds,
  toggledInboxKind,
} from "./inbox-kinds.ts";

const EVERY_KIND = ["chats", "channels", "threads"];

void test("an Inbox filter saved before threads keeps its kinds", () => {
  assert.deepEqual(storedInboxKinds({ inboxFrom: "chats" }), ["chats"]);
  assert.deepEqual(storedInboxKinds({ inboxFrom: "channels" }), ["channels"]);
  // Everything, a space filter from even earlier, or nothing saved lists
  // every kind, threads too.
  assert.deepEqual(storedInboxKinds({ inboxFrom: "everything" }), EVERY_KIND);
  assert.deepEqual(storedInboxKinds({ inboxFrom: "space:1" }), EVERY_KIND);
  assert.deepEqual(storedInboxKinds({}), EVERY_KIND);
});

void test("saved kinds win, in menu order, without unknown ones", () => {
  assert.deepEqual(
    storedInboxKinds({
      inboxFrom: "chats",
      inboxKinds: ["threads", "spaces", "chats", "chats"],
    }),
    ["chats", "threads"],
  );
  assert.deepEqual(storedInboxKinds({ inboxKinds: [] }), []);
});

void test("ticking and unticking a kind", () => {
  assert.deepEqual(toggledInboxKind(["chats", "channels"], "threads"), [
    "chats",
    "channels",
    "threads",
  ]);
  assert.deepEqual(toggledInboxKind(["chats", "threads"], "chats"), [
    "threads",
  ]);
  assert.equal(isDefaultInboxKinds(["threads", "channels", "chats"]), true);
  assert.equal(isDefaultInboxKinds(["chats", "channels"]), false);
  assert.equal(isDefaultInboxKinds(["chats"]), false);
});
