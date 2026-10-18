import assert from "node:assert/strict";
import { test } from "node:test";

import { typingChange } from "./typing-change.ts";

const MAYA = "maya@vera.chat";
const LEO = "leo@vera.chat";
const ME = "me@vera.chat";

function seen(newestKey: string, typists: readonly string[]) {
  return { newestKey, typists };
}

void test("nothing changes, nothing happens", () => {
  assert.equal(
    typingChange(seen("a", [MAYA]), { authorId: ME, key: "a" }, [MAYA]),
    undefined,
  );
});

void test("the first typist shows it, with nothing leaving", () => {
  const change = typingChange(seen("a", []), { authorId: ME, key: "a" }, [
    MAYA,
  ]);
  assert.ok(change !== undefined);
  assert.equal(change.left, undefined);
  assert.deepEqual(change.seen.typists, [MAYA]);
});

void test("someone joining or leaving changes it in place", () => {
  const joined = typingChange(seen("a", [MAYA]), { authorId: ME, key: "a" }, [
    MAYA,
    LEO,
  ]);
  assert.equal(joined?.left, undefined);
  const left = typingChange(
    seen("a", [MAYA, LEO]),
    { authorId: ME, key: "a" },
    [LEO],
  );
  assert.equal(left?.left, undefined);
});

void test("the last typist stopping without sending leaves it to go", () => {
  const change = typingChange(
    seen("a", [MAYA]),
    { authorId: ME, key: "a" },
    [],
  );
  assert.equal(change?.left?.became, false);
  assert.deepEqual(change.left.typists, [MAYA]);
});

void test("the last typist's message takes its place", () => {
  const change = typingChange(
    seen("a", [MAYA]),
    { authorId: MAYA, key: "b" },
    [],
  );
  assert.equal(change?.left?.became, true);
  assert.equal(change.seen.newestKey, "b");
});

void test("a message from one of several stays under it", () => {
  const change = typingChange(
    seen("a", [MAYA, LEO]),
    { authorId: MAYA, key: "b" },
    [LEO],
  );
  assert.ok(change !== undefined);
  assert.equal(change.left, undefined);
  assert.deepEqual(change.seen, { newestKey: "b", typists: [LEO] });
});

void test("someone else's message as the last one stops doesn't take it", () => {
  const change = typingChange(
    seen("a", [MAYA]),
    { authorId: ME, key: "b" },
    [],
  );
  assert.equal(change?.left?.became, false);
});

void test("each ending gets its own key", () => {
  const first = typingChange(seen("a", [MAYA]), { authorId: ME, key: "a" }, []);
  const second = typingChange(
    seen("b", [MAYA]),
    { authorId: ME, key: "b" },
    [],
  );
  assert.ok(first?.left !== undefined && second?.left !== undefined);
  assert.notEqual(first.left.key, second.left.key);
});
