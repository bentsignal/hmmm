import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_LINK_PREVIEWS,
  previewedUrl,
  previewedUrls,
  textParts,
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

void test("finds links without a protocol, but not words with dots", () => {
  assert.deepEqual(previewedUrls("www.maptap.gg October 12"), [
    "https://www.maptap.gg",
  ]);
  assert.deepEqual(previewedUrls("see maptap.gg."), ["https://maptap.gg"]);
  assert.deepEqual(previewedUrls("go to reddit.com/r/soccer now"), [
    "https://reddit.com/r/soccer",
  ]);
  assert.deepEqual(previewedUrls("e.g. node.js, file.txt, v1.2.3, 3.14"), []);
  assert.deepEqual(previewedUrls("mail me@example.com"), []);
  assert.deepEqual(previewedUrls("https://en.wikipedia.org/wiki/Foo_(bar)."), [
    "https://en.wikipedia.org/wiki/Foo_(bar)",
  ]);
});

void test("cuts the previewed link out of the body when it ends it", () => {
  const cases: [string, string][] = [
    ["https://vera.chat", ""],
    ["  https://vera.chat  ", ""],
    ["check this out https://vera.chat", "check this out"],
    ["see https://vera.chat.", "see."],
    ["is this it https://vera.chat?", "is this it?"],
    ["Look: https://vera.chat.", "Look:"],
    ["https://vera.chat is neat", "https://vera.chat is neat"],
    ["read https://vera.chat today", "read https://vera.chat today"],
    ["first\nhttps://vera.chat\nsecond", "first\nhttps://vera.chat\nsecond"],
    ["https://a.com and https://b.com", "https://a.com and https://b.com"],
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

void test("cuts the previewed links the body ends with", () => {
  const cases: [string, string[], string][] = [
    [
      "https://a.com and https://b.com",
      ["https://a.com", "https://b.com"],
      "https://a.com and",
    ],
    [
      "first https://a.com\nhttps://b.com",
      ["https://a.com", "https://b.com"],
      "first",
    ],
    [
      "first https://a.com\nhttps://b.com\nlast",
      ["https://a.com", "https://b.com"],
      "first https://a.com\nhttps://b.com\nlast",
    ],
    [
      "keep https://c.com, drop https://a.com.",
      ["https://c.com", "https://a.com"],
      "keep https://c.com, drop.",
    ],
    ["https://a.com\n\nhttps://b.com", ["https://a.com", "https://b.com"], ""],
    [
      "www.maptap.gg October 12\nFinal score: 850",
      ["https://www.maptap.gg"],
      "www.maptap.gg October 12\nFinal score: 850",
    ],
    ["score: 850 www.maptap.gg", ["https://www.maptap.gg"], "score: 850"],
    ["nothing to cut https://a.com", [], "nothing to cut https://a.com"],
  ];
  for (const [body, urls, expected] of cases) {
    assert.equal(withoutUrls(body, urls), expected, body);
  }
});

void test("splits text into plain runs and tappable links", () => {
  assert.deepEqual(textParts("www.maptap.gg October 12"), [
    { start: 0, text: "www.maptap.gg", url: "https://www.maptap.gg" },
    { start: 13, text: " October 12" },
  ]);
  assert.deepEqual(textParts("no links"), [{ start: 0, text: "no links" }]);
  const long =
    "https://www.reddit.com/r/soccer/comments/1x390rl/a_franchise_staff/";
  assert.deepEqual(textParts(`see ${long} lol`), [
    { start: 0, text: "see " },
    { start: 4, text: "reddit.com/r/soccer/comments/1x390rl/a_…", url: long },
    { start: 4 + long.length, text: " lol" },
  ]);
});
