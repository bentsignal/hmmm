import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isDefaultInboxKinds,
  storedInboxKinds,
  toggledInboxKind,
} from "./inbox-kinds.ts";

const EVERY_KIND = ["chats", "channels", "threads"];

const DEFAULT = ["chats", "channels"];

void test("an Inbox filter saved before threads keeps its kinds", () => {
  assert.deepEqual(storedInboxKinds({ inboxFrom: "chats" }), ["chats"]);
  assert.deepEqual(storedInboxKinds({ inboxFrom: "channels" }), ["channels"]);
  // Everything, a space filter from even earlier, or nothing saved lists
  // the default, without threads.
  assert.deepEqual(storedInboxKinds({ inboxFrom: "everything" }), DEFAULT);
  assert.deepEqual(storedInboxKinds({ inboxFrom: "space:1" }), DEFAULT);
  assert.deepEqual(storedInboxKinds({}), DEFAULT);
});

void test("kinds saved when threads were on at first lose threads once", () => {
  assert.deepEqual(storedInboxKinds({ inboxKinds: EVERY_KIND }), DEFAULT);
  // The rest of the choice stays.
  assert.deepEqual(storedInboxKinds({ inboxKinds: ["chats", "threads"] }), [
    "chats",
  ]);
  // Chosen since: every kind stays every kind.
  assert.deepEqual(
    storedInboxKinds({ inboxIncludes: EVERY_KIND, inboxKinds: ["chats"] }),
    EVERY_KIND,
  );
});

void test("saved kinds win, in menu order, without unknown ones", () => {
  assert.deepEqual(
    storedInboxKinds({
      inboxFrom: "chats",
      inboxIncludes: ["threads", "spaces", "chats", "chats"],
    }),
    ["chats", "threads"],
  );
  assert.deepEqual(storedInboxKinds({ inboxIncludes: [] }), []);
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
  assert.equal(isDefaultInboxKinds(["channels", "chats"]), true);
  assert.equal(isDefaultInboxKinds(["chats", "channels", "threads"]), false);
  assert.equal(isDefaultInboxKinds(["chats"]), false);
});
