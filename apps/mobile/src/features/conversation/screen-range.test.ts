import assert from "node:assert/strict";
import { test } from "node:test";

import { ALL_ON_SCREEN, inRange, onScreenRange } from "./screen-range.ts";

void test("the rows a move draws reach a screen's time either side", () => {
  const range = onScreenRange(1000, 1600);
  assert.deepEqual(range, { newest: 2200, oldest: 400 });
  assert.ok(inRange(range, 400));
  assert.ok(inRange(range, 2200));
  assert.ok(!inRange(range, 399));
  assert.ok(!inRange(range, 2201));
});

void test("one row on screen still reaches past itself", () => {
  const range = onScreenRange(5000, 5000);
  assert.ok(inRange(range, 4999));
  assert.ok(inRange(range, 5001));
});

void test("before the list reports what's on screen, every row moves", () => {
  assert.ok(inRange(ALL_ON_SCREEN, -1e15));
  assert.ok(inRange(ALL_ON_SCREEN, 1e15));
});
