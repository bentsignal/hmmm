import assert from "node:assert/strict";
import { test } from "node:test";

import { risesOf } from "./batch-rises.ts";

void test("one row rises by its own height, as before batches", () => {
  assert.deepEqual(risesOf([60]), [60]);
});

void test("each row rises by its own room and every newer one's", () => {
  // Oldest first: 40 tall, then 60, then the newest, 30.
  assert.deepEqual(risesOf([40, 60, 30]), [130, 90, 30]);
});

void test("a row taking the typing indicator's place can make less room", () => {
  // The newest grew out of a 50-tall indicator into 30: it gave back 20.
  assert.deepEqual(risesOf([40, -20]), [20, -20]);
});

void test("no rows, no rises", () => {
  assert.deepEqual(risesOf([]), []);
});
