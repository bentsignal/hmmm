import assert from "node:assert/strict";
import { test } from "node:test";

import type { ReactionSummary } from "~/features/messaging/reactions";
import { mergedReactions } from "./merged-reactions.ts";

function reaction(
  part: ReactionSummary["part"],
  emoji: string,
  accounts: string[],
  mine = false,
) {
  return {
    accounts,
    count: accounts.length,
    emoji,
    mine,
    part,
  } satisfies ReactionSummary;
}

void test("reactions on the parts asked for count once per person and emoji", () => {
  const merged = mergedReactions(
    [
      reaction("message", "❤️", ["maya"]),
      reaction(1, "❤️", ["maya", "me"], true),
      reaction(1, "🔥", ["priya"]),
      reaction(2, "❤️", ["jonah"]),
    ],
    ["message", 1],
  );
  assert.deepEqual(merged, [
    reaction("message", "❤️", ["maya", "me"], true),
    reaction(1, "🔥", ["priya"]),
  ]);
});

void test("no reactions merge to none", () => {
  assert.deepEqual(mergedReactions(undefined, [0, 1]), []);
});
