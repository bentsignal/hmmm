import assert from "node:assert/strict";
import { test } from "node:test";

import type { ConversationSummary, ThreadSummaryRow } from "./types.ts";
import { filterInbox } from "./filter.ts";

function conversation(
  id: string,
  minute: number,
  extra: Partial<ConversationSummary> = {},
) {
  return {
    account: "me@vera.chat",
    affiliated: false,
    alerts: "all",
    avatarUrl: null,
    hasMessages: true,
    id,
    key: id,
    kind: "group",
    lastActivityAt: new Date(minute * 60_000),
    lastMessage: "",
    memberIds: [],
    muted: false,
    pinnedAt: null,
    spaceId: null,
    spaceName: null,
    title: id,
    unreadCount: 0,
    ...extra,
  } satisfies ConversationSummary;
}

function thread(id: string, minute: number, unreadCount = 0) {
  return {
    account: "me@vera.chat",
    conversationId: "group",
    conversationTitle: "Group",
    key: `thread:${id}`,
    lastActivityAt: new Date(minute * 60_000),
    latestReply: "",
    replyCount: 2,
    rootAuthor: { avatarUrl: null, name: "Maya" },
    rootText: "",
    threadId: id,
    unreadCount,
  } satisfies ThreadSummaryRow;
}

const conversations = [
  conversation("chat", 5, { unreadCount: 1 }),
  conversation("channel", 3, { kind: "channel" }),
  conversation("pinned", 1, { pinnedAt: 10 }),
];
const threads = [thread("new", 6, 2), thread("old", 2)];

function keys(items: readonly { key: string }[]) {
  return items.map(({ key }) => key);
}

void test("threads mix in among conversations, newest first", () => {
  const { pinned, rest } = filterInbox({
    conversations,
    kinds: ["chats", "channels", "threads"],
    show: "all",
    threads,
  });
  assert.deepEqual(keys(pinned), ["pinned"]);
  assert.deepEqual(keys(rest), ["thread:new", "chat", "channel", "thread:old"]);
});

void test("threads stay out when unticked", () => {
  const { rest } = filterInbox({
    conversations,
    kinds: ["chats", "channels"],
    show: "all",
    threads,
  });
  assert.deepEqual(keys(rest), ["chat", "channel"]);
});

void test("each kind can be listed alone", () => {
  function only(kind: "channels" | "chats" | "threads") {
    return filterInbox({ conversations, kinds: [kind], show: "all", threads });
  }
  assert.deepEqual(keys(only("chats").rest), ["chat"]);
  assert.deepEqual(keys(only("channels").rest), ["channel"]);
  assert.deepEqual(keys(only("threads").rest), ["thread:new", "thread:old"]);
  assert.deepEqual(keys(only("threads").pinned), []);
});

void test("unread shows threads with unread replies", () => {
  const { pinned, rest } = filterInbox({
    conversations,
    kinds: ["chats", "channels", "threads"],
    show: "unread",
    threads,
  });
  assert.deepEqual(keys(pinned), []);
  assert.deepEqual(keys(rest), ["thread:new", "chat"]);
});
