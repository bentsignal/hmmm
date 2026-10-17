import assert from "node:assert/strict";
import { test } from "node:test";

import { homeCount } from "./home-count.ts";

const conversations = [
  { alerts: "all", kind: "direct", muted: false, unreadCount: 3 },
  { alerts: "all", kind: "group", muted: false, unreadCount: 0 },
  { alerts: "mentions", kind: "group", muted: false, unreadCount: 2 },
  { alerts: "none", kind: "group", muted: true, unreadCount: 2 },
  { alerts: "all", kind: "channel", muted: false, unreadCount: 1 },
  // From a server before alert levels.
  { kind: "group", muted: false, unreadCount: 1 },
] as const;
const threads = [{ unreadCount: 2 }, { unreadCount: 0 }];

void test("counts each unread row the Inbox lists that alerts about everything", () => {
  assert.equal(
    homeCount({ conversations, kinds: ["chats", "channels"], threads }),
    3,
  );
  assert.equal(homeCount({ conversations, kinds: ["chats"], threads }), 2);
  assert.equal(homeCount({ conversations, kinds: ["channels"], threads }), 1);
});

void test("counts threads with unread replies when the Inbox lists them", () => {
  assert.equal(
    homeCount({ conversations: [], kinds: ["chats", "threads"], threads }),
    1,
  );
  assert.equal(homeCount({ conversations: [], kinds: [], threads }), 0);
});
