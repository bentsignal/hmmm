import assert from "node:assert/strict";
import { test } from "node:test";

import type { RestartState } from "./restart-policy.ts";
import { canRestartForUpdate, OPEN_WINDOW_MS } from "./restart-policy.ts";

const OPENED = {
  active: true,
  now: 10_000,
  openedAt: 9_000,
  pendingMutations: 0,
  unsentMessages: false,
} satisfies RestartState;

void test("an update ready while the app opens restarts it", () => {
  assert.equal(canRestartForUpdate(OPENED), true);
  assert.equal(
    canRestartForUpdate({ ...OPENED, now: OPENED.openedAt + OPEN_WINDOW_MS }),
    true,
  );
});

void test("an update ready after the app is in use waits", () => {
  assert.equal(
    canRestartForUpdate({
      ...OPENED,
      now: OPENED.openedAt + OPEN_WINDOW_MS + 1,
    }),
    false,
  );
});

void test("nothing in flight is lost to a restart", () => {
  assert.equal(canRestartForUpdate({ ...OPENED, unsentMessages: true }), false);
  assert.equal(canRestartForUpdate({ ...OPENED, pendingMutations: 1 }), false);
});

void test("an app back in the background isn't restarted", () => {
  assert.equal(canRestartForUpdate({ ...OPENED, active: false }), false);
});
