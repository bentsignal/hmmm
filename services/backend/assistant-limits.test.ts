import assert from "node:assert/strict";
import { test } from "node:test";

import type { Bucket } from "./assistant-limits.ts";
import {
  current,
  decide,
  REPLIES_PER_HOUR,
  STRIKES_PER_DAY,
} from "./assistant-limits.ts";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const empty: Bucket = { accountId: "a@vera.chat", tokens: 0, updatedAt: 0 };

void test("a new person has the full hour", () => {
  const bucket = current(null, "a@vera.chat", 0);
  assert.equal(bucket.tokens, REPLIES_PER_HOUR);
  assert.equal(decide(bucket, 0).ok, true);
});

void test("the hour refills continuously", () => {
  const halfHourLater = current(empty, "a@vera.chat", HOUR / 2);
  assert.equal(halfHourLater.tokens, REPLIES_PER_HOUR / 2);
  assert.equal(
    current(empty, "a@vera.chat", 2 * HOUR).tokens,
    REPLIES_PER_HOUR,
  );
});

void test("running dry is one strike and one notice per stretch", () => {
  const first = decide(empty, 0);
  assert.equal(first.ok, false);
  assert.equal(first.bucket.strikes, 1);
  assert.match(first.notice ?? "", /limit of 300 messages an hour/);
  const again = decide(first.bucket, 0);
  assert.equal(again.ok, false);
  assert.equal(again.bucket.strikes, 1);
  assert.equal(again.notice, null);
});

void test("a reply between stretches makes the next one a new strike", () => {
  const struck = decide(empty, 0).bucket;
  const replied = decide({ ...struck, tokens: 1 }, 1000).bucket;
  assert.equal(replied.limited, undefined);
  assert.equal(decide(replied, 2000).bucket.strikes, 2);
});

void test("five strikes in a day pause the assistants until the day is up", () => {
  const nearlyPaused = {
    ...empty,
    strikes: STRIKES_PER_DAY - 1,
    strikesSince: 0,
  };
  const paused = decide(nearlyPaused, HOUR);
  assert.equal(paused.ok, false);
  assert.match(
    paused.notice ?? "",
    /paused for you\. Try again in about 23 hours/,
  );
  // Even with replies to spare, they wait, and hear about it once.
  const later = decide({ ...paused.bucket, tokens: 50 }, 2 * HOUR);
  assert.equal(later.ok, false);
  assert.equal(later.notice, null);
  // A day after the first strike, it's all forgotten.
  const tomorrow = current(
    { ...paused.bucket, tokens: 50 },
    "a@vera.chat",
    DAY,
  );
  assert.equal(tomorrow.strikes, undefined);
  assert.equal(decide(tomorrow, DAY).ok, true);
});
