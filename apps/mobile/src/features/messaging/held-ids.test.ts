import assert from "node:assert/strict";
import { test } from "node:test";

import { previousIds, withLoaded } from "./held-ids.ts";

void test("a batch that grew shows what it loaded with before", () => {
  const held = withLoaded(new Map(), [["a", "b"]]);
  assert.deepEqual(previousIds(held, ["a", "b", "c"]), ["a", "b"]);
});

void test("a batch loaded under its own IDs needs no stand-in", () => {
  const held = withLoaded(new Map(), [["a", "b"]]);
  assert.equal(previousIds(held, ["a", "b"]), undefined);
});

void test("a batch that never loaded has nothing to show", () => {
  const held = withLoaded(new Map(), [["a", "b"]]);
  assert.equal(previousIds(held, ["x", "y"]), undefined);
  assert.equal(previousIds(held, []), undefined);
});

void test("loading under new IDs replaces the old ones", () => {
  const first = withLoaded(new Map(), [["a", "b"], ["x"]]);
  const second = withLoaded(first, [["a", "b", "c"]]);
  assert.deepEqual(second.get("a"), ["a", "b", "c"]);
  assert.deepEqual(second.get("x"), ["x"]);
  assert.equal(previousIds(second, ["a", "b", "c"]), undefined);
});

void test("nothing new loaded keeps the same map", () => {
  const held = withLoaded(new Map(), [["a", "b"]]);
  assert.equal(withLoaded(held, [["a", "b"], []]), held);
  assert.equal(withLoaded(held, []), held);
});
