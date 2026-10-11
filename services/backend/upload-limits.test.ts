import assert from "node:assert/strict";
import { test } from "node:test";

import { MAX_UPLOAD_BYTES, uploadSizeAllowed } from "./upload-limits.ts";

void test("an unknown size (0) is allowed, as older apps send for video posters", () => {
  assert.equal(uploadSizeAllowed("image", 0), true);
  assert.equal(uploadSizeAllowed("video", 0), true);
});

void test("typical phone media fits", () => {
  // A 60-second 1080p iPhone video is around 130 MB once made compatible.
  assert.equal(uploadSizeAllowed("video", 130_000_000), true);
  assert.equal(uploadSizeAllowed("image", 8_000_000), true);
  assert.equal(uploadSizeAllowed("file", 40_000_000), true);
});

void test("each kind stops at its limit", () => {
  for (const kind of ["file", "image", "video"] as const) {
    assert.equal(uploadSizeAllowed(kind, MAX_UPLOAD_BYTES[kind]), true);
    assert.equal(uploadSizeAllowed(kind, MAX_UPLOAD_BYTES[kind] + 1), false);
  }
});

void test("limits only grew from the first release", () => {
  const MiB = 1024 * 1024;
  assert.ok(MAX_UPLOAD_BYTES.image >= 25 * MiB);
  assert.ok(MAX_UPLOAD_BYTES.file >= 50 * MiB);
  assert.ok(MAX_UPLOAD_BYTES.video >= 200 * MiB);
});

void test("negative and non-numeric sizes are refused", () => {
  assert.equal(uploadSizeAllowed("image", -1), false);
  assert.equal(uploadSizeAllowed("image", Number.NaN), false);
  assert.equal(uploadSizeAllowed("image", Number.POSITIVE_INFINITY), false);
});
