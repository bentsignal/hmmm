import assert from "node:assert/strict";
import { test } from "node:test";

import { typingChange } from "./typing-change.ts";

const MAYA = "maya@vera.chat";
const LEO = "leo@vera.chat";
const ME = "me@vera.chat";

function seen(newestKey: string, typists: readonly string[]) {
  return { arrived: false, newestKey, typists };
}

void test("nothing changes, nothing happens", () => {
  assert.equal(
    typingChange(seen("a", [MAYA]), { authorId: ME, key: "a" }, [MAYA]),
    undefined,
  );
});

void test("the first typist opens the space", () => {
  const change = typingChange(seen("a", []), { authorId: ME, key: "a" }, [
    MAYA,
  ]);
  assert.equal(change?.reopened, true);
  assert.equal(change.left, undefined);
});

void test("someone joining or leaving changes it in place", () => {
  const joined = typingChange(seen("a", [MAYA]), { authorId: ME, key: "a" }, [
    MAYA,
    LEO,
  ]);
  assert.deepEqual(
    {
      left: joined?.left,
      reappeared: joined?.reappeared,
      reopened: joined?.reopened,
    },
    { left: undefined, reappeared: false, reopened: false },
  );
});

void test("the last typist stopping leaves it in place as the space closes", () => {
  const change = typingChange(
    seen("a", [MAYA]),
    { authorId: ME, key: "a" },
    [],
  );
  assert.equal(change?.left?.became, false);
  assert.deepEqual(change.left.typists, [MAYA]);
  // The space closes in a frame of its own, where the list eases down.
  assert.equal(change.reopened, false);
  assert.equal(change.seen.arrived, false);
});

void test("their message becomes it, in the same commit", () => {
  const change = typingChange(
    seen("a", [MAYA]),
    { authorId: MAYA, key: "b" },
    [],
  );
  assert.equal(change?.left?.became, true);
  assert.equal(change.reopened, true);
  assert.equal(change.seen.arrived, true);
});

void test("one typist sending while another types shows it again under it", () => {
  const change = typingChange(
    seen("a", [MAYA, LEO]),
    { authorId: MAYA, key: "b" },
    [LEO],
  );
  assert.equal(change?.left?.became, true);
  assert.equal(change.reappeared, true);
  assert.equal(change.reopened, false);
});

void test("your own message while others type leaves it be", () => {
  const change = typingChange(seen("a", [MAYA]), { authorId: ME, key: "b" }, [
    MAYA,
  ]);
  assert.deepEqual(
    {
      left: change?.left,
      reappeared: change?.reappeared,
      reopened: change?.reopened,
    },
    { left: undefined, reappeared: false, reopened: false },
  );
});

void test("staying last, a typist's message slots in above it", () => {
  const change = typingChange(
    seen("a", [MAYA, LEO]),
    { authorId: MAYA, key: "b" },
    [LEO],
    "stays",
  );
  assert.ok(change);
  assert.equal(change.left, undefined);
  assert.equal(change.reappeared, false);
  // The last one sending: it leaves where it was, under the message.
  const last = typingChange(
    seen("a", [MAYA]),
    { authorId: MAYA, key: "b" },
    [],
    "stays",
  );
  assert.equal(last?.left?.became, false);
  assert.equal(last.reopened, true);
});

void test("stepping aside, it goes at once as a message lands", () => {
  const sent = typingChange(
    seen("a", [MAYA]),
    { authorId: MAYA, key: "b" },
    [],
    "stepsAside",
  );
  assert.ok(sent);
  assert.equal(sent.left, undefined);
  assert.equal(sent.reopened, true);
  // Stopping without sending still shrinks away.
  const stopped = typingChange(
    seen("a", [MAYA]),
    { authorId: ME, key: "a" },
    [],
    "stepsAside",
  );
  assert.equal(stopped?.left?.became, false);
});
