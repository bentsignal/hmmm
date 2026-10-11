import assert from "node:assert/strict";
import { test } from "node:test";

import type { Rect } from "./menu-layout.ts";
import { EDGE, GAP, LIFT, menuLayout } from "./menu-layout.ts";

const screen = { height: 800, width: 400 };
const insets = { bottom: 30, top: 50 };
const bar = { height: 54, width: 274 };
const menu = { height: 200, width: 230 };
const minTop = insets.top + EDGE + bar.height + GAP;
const maxBottom = screen.height - insets.bottom - EDGE - menu.height - GAP;

function layout(frame: Rect, align: "end" | "start" = "end") {
  return menuLayout({ align, bar, frame, insets, menu, screen });
}

void test("an element with room stays where it is, lifted a little", () => {
  const result = layout({ height: 60, width: 200, x: 180, y: 300 });
  assert.equal(result.shift, 0);
  assert.equal(result.scale, 1 + LIFT);
  assert.equal(result.barTop, 300 - GAP - bar.height);
  assert.equal(result.menuTop, 300 + 60 * (1 + LIFT) + GAP);
});

void test("an element low on screen moves up so the actions fit", () => {
  const frame = { height: 160, width: 256, x: 124, y: 640 };
  const result = layout(frame);
  const height = frame.height * (1 + LIFT);
  assert.equal(frame.y + result.shift, maxBottom - height);
  assert.equal(result.menuTop + menu.height, maxBottom + GAP + menu.height);
});

void test("an element under the top moves down below the bar", () => {
  const result = layout({ height: 60, width: 200, x: 180, y: 20 });
  assert.equal(20 + result.shift, minTop);
  assert.ok(result.barTop >= insets.top + EDGE);
});

void test("an element taller than the room shrinks to fit between bar and actions", () => {
  const frame = { height: 1400, width: 300, x: 88, y: -200 };
  const result = layout(frame);
  assert.ok(result.scale < 1);
  assert.equal(frame.y + result.shift, minTop);
  assert.equal(
    Math.round(result.menuTop + menu.height),
    Math.round(maxBottom + GAP + menu.height),
  );
});

void test("the bar and actions line up with the element's side, on screen", () => {
  const end = layout({ height: 60, width: 100, x: 288, y: 300 });
  assert.equal(Math.round(end.menuLeft), 288 + 100 - menu.width);
  assert.equal(end.barLeft, screen.width - bar.width - EDGE);
  const start = layout({ height: 60, width: 100, x: 16, y: 300 }, "start");
  assert.equal(start.menuLeft, 16);
  assert.equal(start.barLeft, 16);
});
