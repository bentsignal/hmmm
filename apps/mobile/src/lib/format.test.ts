import assert from "node:assert/strict";
import { test } from "node:test";

import { formatTimeAgo } from "./format.ts";

void test("time ago reads in the largest whole unit", () => {
  const now = new Date(2026, 9, 16, 12, 0);
  function before(minutes: number) {
    return formatTimeAgo(new Date(now.getTime() - minutes * 60_000), now);
  }
  assert.equal(before(0), "Just now");
  assert.equal(before(5), "5m ago");
  assert.equal(before(59), "59m ago");
  assert.equal(before(2 * 60 + 10), "2h ago");
  assert.equal(before(3 * 24 * 60), "3d ago");
  assert.equal(before(8 * 24 * 60).endsWith("ago"), false);
});
