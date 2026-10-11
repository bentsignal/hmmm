import assert from "node:assert/strict";
import { test } from "node:test";

import type { PlaceholderStage } from "./placeholder-timing.ts";
import {
  cardFace,
  initialStage,
  minElapsed,
  PENDING_MIN_MS,
  PENDING_MS,
  resolveStage,
  startMinClock,
  startPendingClock,
} from "./placeholder-timing.ts";

/**
 * A card as the component runs it: `render` resolves the stage as a render
 * would, and drawing the placeholder starts its minimum time.
 */
function card(loaded = false) {
  // Every stage the card has been in, the current one last.
  const stages = new Array<PlaceholderStage>();
  stages.push(initialStage(loaded));
  let isLoaded = loaded;
  let pendingDue = false;
  let held = false;
  function stage() {
    return stages.at(-1) ?? "waiting";
  }
  function render() {
    stages.push(resolveStage({ loaded: isLoaded, pendingDue, stage: stage() }));
    const face = cardFace(isLoaded, stage());
    if (face === "placeholder" && !held) {
      held = true;
      startMinClock(() => {
        stages.push(minElapsed(stage()));
        render();
      });
    }
    return face;
  }
  return {
    appear: () => {
      if (stage() === "waiting") {
        startPendingClock(() => {
          pendingDue = true;
          render();
        });
      }
    },
    load: () => {
      isLoaded = true;
      return render();
    },
    render,
    /** The pending timer and the preview land in one render. */
    loadWithPendingDue: () => {
      isLoaded = true;
      pendingDue = true;
      return render();
    },
  };
}

void test("a card that has its preview shows it at once", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const loaded = card(true);
  loaded.appear();
  assert.equal(loaded.render(), "card");
  t.mock.timers.tick(PENDING_MS + PENDING_MIN_MS);
  assert.equal(loaded.render(), "card");
});

void test("a preview inside the pending window skips the placeholder", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const fast = card();
  fast.appear();
  assert.equal(fast.render(), "space");
  t.mock.timers.tick(PENDING_MS - 1);
  assert.equal(fast.load(), "card");
  t.mock.timers.tick(PENDING_MIN_MS + 1);
  assert.equal(fast.render(), "card");
});

void test("a preview rendered with the pending timer still wins", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const busy = card();
  busy.appear();
  assert.equal(busy.loadWithPendingDue(), "card");
});

void test("a shown placeholder stays for the minimum time", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const slow = card();
  slow.appear();
  t.mock.timers.tick(PENDING_MS);
  assert.equal(slow.render(), "placeholder");
  t.mock.timers.tick(100);
  assert.equal(slow.load(), "placeholder");
  t.mock.timers.tick(PENDING_MIN_MS - 101);
  assert.equal(slow.render(), "placeholder");
  t.mock.timers.tick(1);
  assert.equal(slow.render(), "card");
});

void test("a preview after the minimum time replaces the placeholder at once", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const slower = card();
  slower.appear();
  t.mock.timers.tick(PENDING_MS);
  assert.equal(slower.render(), "placeholder");
  t.mock.timers.tick(PENDING_MIN_MS + 2000);
  assert.equal(slower.render(), "placeholder");
  assert.equal(slower.load(), "card");
});
