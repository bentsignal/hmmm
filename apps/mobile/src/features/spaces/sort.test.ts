import assert from "node:assert/strict";
import { test } from "node:test";

import { sortSpaces } from "./sort.ts";

const spaces = [
  { joinedAt: 200, name: "Climbing" },
  { joinedAt: 300, name: "Book Club" },
  { name: "Old PDS" },
  { joinedAt: 100, name: "Art" },
];

function names(list: readonly { name: string }[]) {
  return list.map((space) => space.name);
}

void test("name sorts alphabetically across accounts", () => {
  assert.deepEqual(names(sortSpaces(spaces, "name")), [
    "Art",
    "Book Club",
    "Climbing",
    "Old PDS",
  ]);
});

void test("newest puts the space joined last first", () => {
  assert.deepEqual(names(sortSpaces(spaces, "newest")), [
    "Book Club",
    "Climbing",
    "Art",
    "Old PDS",
  ]);
});

void test("oldest counts a space without a join time as oldest", () => {
  assert.deepEqual(names(sortSpaces(spaces, "oldest")), [
    "Old PDS",
    "Art",
    "Climbing",
    "Book Club",
  ]);
});

void test("ties in join time go by name", () => {
  const tied = [
    { joinedAt: 5, name: "B" },
    { joinedAt: 5, name: "A" },
  ];
  assert.deepEqual(names(sortSpaces(tied, "newest")), ["A", "B"]);
});
