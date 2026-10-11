import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_LINK_PREVIEWS,
  previewedUrl,
  previewedUrls,
  withoutPreviewedUrl,
  withoutUrls,
} from "./links.ts";

void test("previews the first link, without trailing punctuation", () => {
  assert.equal(
    previewedUrl("see https://a.com/x). and https://b.com"),
    "https://a.com/x",
  );
  assert.equal(previewedUrl("no links here"), undefined);
});

void test("cuts the previewed link out of the body", () => {
  const cases: [string, string][] = [
    ["https://vera.chat", ""],
    ["  https://vera.chat  ", ""],
    ["check this out https://vera.chat", "check this out"],
    ["https://vera.chat is neat", "is neat"],
    ["read https://vera.chat today", "read today"],
    ["see https://vera.chat.", "see."],
    ["is this it https://vera.chat?", "is this it?"],
    ["Look: https://vera.chat.", "Look:"],
    ["the site (https://vera.chat) is up", "the site is up"],
    ["first\nhttps://vera.chat\nsecond", "first\nsecond"],
    ["first\n\nhttps://vera.chat\n\nsecond", "first\n\nsecond"],
    ["https://a.com and https://b.com", "and https://b.com"],
    ["no links here", "no links here"],
  ];
  for (const [body, expected] of cases) {
    assert.equal(withoutPreviewedUrl(body), expected, body);
  }
});

void test("previews each different link, up to the limit", () => {
  assert.deepEqual(
    previewedUrls("https://a.com, https://b.com. Again https://a.com"),
    ["https://a.com", "https://b.com"],
  );
  const many = Array.from({ length: 6 }, (_, i) => `https://${i}.com`);
  assert.deepEqual(
    previewedUrls(many.join(" ")),
    many.slice(0, MAX_LINK_PREVIEWS),
  );
  assert.deepEqual(previewedUrls(`https://a.com/${"x".repeat(3000)}`), []);
  assert.deepEqual(previewedUrls("no links"), []);
});

void test("cuts every previewed link out of the body", () => {
  const cases: [string, string[], string][] = [
    [
      "https://a.com and https://b.com",
      ["https://a.com", "https://b.com"],
      "and",
    ],
    [
      "first https://a.com\nhttps://b.com\nlast",
      ["https://a.com", "https://b.com"],
      "first\nlast",
    ],
    ["https://a.com https://a.com twice", ["https://a.com"], "twice"],
    [
      "keep https://c.com, drop https://a.com.",
      ["https://a.com"],
      "keep https://c.com, drop.",
    ],
    ["https://a.com\n\nhttps://b.com", ["https://a.com", "https://b.com"], ""],
    ["nothing to cut https://a.com", [], "nothing to cut https://a.com"],
  ];
  for (const [body, urls, expected] of cases) {
    assert.equal(withoutUrls(body, urls), expected, body);
  }
});
