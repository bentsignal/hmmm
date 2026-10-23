import assert from "node:assert/strict";
import test from "node:test";

import type { MessageRow } from "./build-rows.ts";
import type { MemberNotice, Message } from "./types.ts";
import { buildMessageRows, newestFirst } from "./build-rows.ts";

const START = new Date(2026, 9, 22, 9, 0).getTime();

function message(id: string, minute: number, authorId = "maya") {
  return {
    attachments: [],
    authorId,
    body: id,
    id,
    reactions: [],
    sentAt: new Date(START + minute * 60_000),
  } satisfies Message;
}

function notice(id: string, minute: number) {
  return {
    accountId: "leo",
    at: new Date(START + minute * 60_000),
    id,
    kind: "joined",
    name: "Leo",
  } satisfies MemberNotice;
}

/** Every row's order comes after the one before it, and keys are unique. */
function assertOrdered(rows: readonly MessageRow[]) {
  for (let index = 1; index < rows.length; index += 1) {
    const before = rows[index - 1];
    const row = rows[index];
    assert.ok(
      before !== undefined && row !== undefined && row.order > before.order,
      `${row?.key ?? "?"} comes after ${before?.key ?? "?"}`,
    );
  }
  assert.equal(new Set(rows.map((row) => row.key)).size, rows.length);
}

void test("rows come out in order, with a header after a pause", () => {
  const rows = buildMessageRows(
    [message("a", 0), message("b", 1), message("c", 90)],
    "bubbles",
  );
  assert.deepEqual(
    rows.map((row) => row.key),
    ["time-a", "a", "b", "time-c", "c"],
  );
  assertOrdered(rows);
});

void test("messages and notices at the same moment still get orders of their own", () => {
  const rows = buildMessageRows(
    [message("a", 0), message("b", 0, "jonah"), message("c", 0)],
    "stacked",
    undefined,
    [notice("n", 0)],
  );
  assert.deepEqual(
    rows.map((row) => row.key),
    ["day-a", "a", "b", "c", "n"],
  );
  assertOrdered(rows);
});

void test("a header knows the message or notice it's over", () => {
  const rows = buildMessageRows([message("a", 0)], "stacked", undefined, [
    notice("n", -60 * 24),
  ]);
  const owners = rows.flatMap((row) =>
    row.type === "day" || row.type === "time" ? [row.owner] : [],
  );
  assert.deepEqual(owners, ["n", "a"]);
});

void test("a message's row is the same object while it comes out the same", () => {
  const messages = [message("a", 0), message("b", 1)];
  const first = buildMessageRows(messages, "bubbles");
  // One more message: the first keeps its row, the second ends its run no
  // longer, so it's a new one.
  const second = buildMessageRows([...messages, message("c", 2)], "bubbles");
  assert.equal(second[1], first[1]);
  assert.notEqual(second[2], first[2]);
});

void test("in a thread, the original comes first, then the divider", () => {
  const root = message("root", 0);
  const rows = newestFirst([message("r1", 1, "jonah")], "bubbles", {
    replyCount: 1,
    root,
  }).toReversed();
  assert.deepEqual(
    rows.map((row) => row.key),
    ["time-root", "root", "replies", "r1"],
  );
  assertOrdered(rows);
});
