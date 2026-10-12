import assert from "node:assert/strict";
import test from "node:test";

import { previewFromHtml } from "./opengraph.ts";

const URL = "https://news.example.com/2026/10/12/story";

void test("previewFromHtml reads Open Graph tags, apostrophes and all", () => {
  const html = `<html><head>
    <title>Ignored | Example</title>
    <meta property="og:title" content="Biden's plan, explained" />
    <meta content='The "short" version' property='og:description'>
    <meta property="og:image" content="/img/lead.jpg">
    <meta property="og:site_name" content="Example News">
  </head><body></body></html>`;
  assert.deepEqual(previewFromHtml(html, URL), {
    preview: {
      description: 'The "short" version',
      imageUrl: "https://news.example.com/img/lead.jpg",
      siteName: "Example News",
      title: "Biden's plan, explained",
      url: URL,
    },
    tagged: true,
  });
});

void test("previewFromHtml falls back to other image tags", () => {
  const twitter = previewFromHtml(
    `<meta name="twitter:title" content="A"><meta name="twitter:image:src" content="https://cdn.example.com/a.png">`,
    URL,
  );
  assert.equal(twitter.preview?.imageUrl, "https://cdn.example.com/a.png");
  const linked = previewFromHtml(
    `<meta property="og:title" content="B"><link rel="image_src" href="https://cdn.example.com/b.png">`,
    URL,
  );
  assert.equal(linked.preview?.imageUrl, "https://cdn.example.com/b.png");
});

void test("previewFromHtml marks a page with only a <title> as untagged", () => {
  const result = previewFromHtml("<title>Example News</title>", URL);
  assert.equal(result.tagged, false);
  assert.equal(result.preview?.title, "Example News");
});

void test("previewFromHtml has nothing for a bot wall", () => {
  for (const title of [
    "Just a moment...",
    "Access Denied",
    "Attention Required! | Cloudflare",
    "Log in or sign up to view",
    "Log into Facebook | Facebook",
    "Login • Instagram",
  ]) {
    assert.deepEqual(previewFromHtml(`<title>${title}</title>`, URL), {
      preview: null,
      tagged: false,
    });
  }
});

void test("previewFromHtml drops images not served over https", () => {
  const result = previewFromHtml(
    `<meta property="og:title" content="C"><meta property="og:image" content="http://cdn.example.com/c.png">`,
    URL,
  );
  assert.equal(result.preview?.imageUrl, undefined);
});
