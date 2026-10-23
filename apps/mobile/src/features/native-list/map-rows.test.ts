import assert from "node:assert/strict";
import { test } from "node:test";

import type { Message } from "../conversation/types.ts";
import type { RowContext } from "./map-rows.ts";
import type { MediaBlock, MessageRow, Row, TextBlock } from "./contract.ts";
import { newestFirst } from "../conversation/build-rows.ts";
import { V1_BLOCK_TYPES, V1_ROW_KINDS } from "./contract.ts";
import { isJumbo } from "./jumbo.ts";
import {
  nativeRows,
  parseReactionKey,
  reactionKey,
  spansOf,
  supported,
} from "./map-rows.ts";

const ME = "me@vera.test";
const MAYA = "maya@vera.test";
const LEO = "leo@vera.test";
const START = new Date(2026, 9, 22, 9, 0).getTime();

const NAMES: Record<string, string> = {
  [LEO]: "Leo Park",
  [MAYA]: "Maya Chen",
  [ME]: "Me",
};

function context(overrides: Partial<RowContext> = {}): RowContext {
  return {
    layout: "bubbles",
    now: new Date(START + 60 * 60_000),
    openedAt: START + 30 * 60_000,
    profileOf: (address) => ({
      avatarUrl: address === LEO ? "https://example.com/leo.jpg" : null,
      displayName: NAMES[address] ?? address,
    }),
    self: ME,
    showAuthors: true,
    support: { blockTypes: V1_BLOCK_TYPES, rowKinds: V1_ROW_KINDS },
    ...overrides,
  };
}

function message(
  id: string,
  minute: number,
  extra: Partial<Message> = {},
): Message {
  return {
    attachments: [],
    authorId: MAYA,
    body: id,
    id,
    reactions: [],
    sentAt: new Date(START + minute * 60_000),
    ...extra,
  };
}

function photo(name: string, width = 1200, height = 900) {
  return {
    height,
    kind: "image" as const,
    mimeType: "image/jpeg",
    name,
    size: 1000,
    url: `https://example.com/${name}`,
    width,
  };
}

function rowsOf(
  messages: readonly Message[],
  overrides: Partial<RowContext> = {},
  typists: readonly string[] = [],
) {
  const shown = context(overrides);
  return nativeRows(
    newestFirst(messages, shown.layout, undefined),
    typists,
    shown,
  );
}

function messageRows(rows: readonly Row[]) {
  return rows.filter((row): row is MessageRow => row.kind === "message");
}

function only<Value>(values: readonly Value[]): Value {
  assert.equal(values.length, 1);
  const [value] = values;
  assert.ok(value !== undefined);
  return value;
}

void test("rows come newest first, with a header over the oldest", () => {
  const rows = rowsOf([message("a", 0), message("b", 1), message("c", 2)]);
  assert.deepEqual(
    rows.map((row) => row.id),
    ["c", "b", "a", "time-a"],
  );
  const header = rows[3];
  assert.equal(header?.kind, "header");
  if (header?.kind === "header") {
    assert.equal(header.style, "time");
    assert.match(header.label, /^Today /);
  }
});

void test("stacked rows get day separators", () => {
  const rows = rowsOf([message("a", 0)], { layout: "stacked" });
  const header = rows[1];
  assert.equal(header?.kind, "header");
  if (header?.kind === "header") {
    assert.equal(header.style, "day");
    assert.equal(header.label, "Today");
  }
});

void test("runs: the first starts the group, the last ends it", () => {
  const [newest, middle, oldest] = messageRows(
    rowsOf([message("a", 0), message("b", 1), message("c", 2)]),
  );
  assert.deepEqual(
    [oldest?.startsGroup, oldest?.endsGroup],
    [true, false],
  );
  assert.deepEqual([middle?.startsGroup, middle?.endsGroup], [false, false]);
  assert.deepEqual([newest?.startsGroup, newest?.endsGroup], [false, true]);
});

void test("authors: initials, photos, and who's own", () => {
  const rows = messageRows(
    rowsOf([
      message("a", 0, { authorId: LEO }),
      message("b", 5, { authorId: ME }),
    ]),
  );
  const [mine, leos] = rows;
  assert.equal(leos?.author.initials, "LP");
  assert.equal(leos?.author.avatarUrl, "https://example.com/leo.jpg");
  assert.equal(leos?.showAuthor, true);
  assert.equal(leos?.isOwn, false);
  assert.equal(mine?.isOwn, true);
  // Bubbles never name your own; stacked rows name everyone.
  assert.equal(mine?.showAuthor, false);
  const stacked = messageRows(
    rowsOf([message("b", 5, { authorId: ME })], { layout: "stacked" }),
  );
  assert.equal(stacked[0]?.showAuthor, true);
});

void test("direct chats don't show the other person's name", () => {
  const rows = messageRows(rowsOf([message("a", 0)], { showAuthors: false }));
  assert.equal(rows[0]?.showAuthor, false);
});

void test("text becomes spans with mentions and links", () => {
  const spans = spansOf("hey @Maya Chen see https://vera.chat ok", [
    { accountId: MAYA, name: "Maya Chen" },
  ]);
  assert.deepEqual(spans, [
    { text: "hey " },
    { accountId: MAYA, style: "mention", text: "@Maya Chen" },
    { text: " see " },
    { style: "link", text: "https://vera.chat", url: "https://vera.chat" },
    { text: " ok" },
  ]);
});

void test("only emoji, up to three, is jumbo", () => {
  assert.equal(isJumbo("😂"), true);
  assert.equal(isJumbo("😂 😂😂"), true);
  assert.equal(isJumbo("👍🏽"), true);
  assert.equal(isJumbo("👨‍👩‍👧"), true);
  assert.equal(isJumbo("🇨🇦"), true);
  assert.equal(isJumbo("❤️"), true);
  assert.equal(isJumbo("😂😂😂😂"), false);
  assert.equal(isJumbo("lol 😂"), false);
  assert.equal(isJumbo("123"), false);
  assert.equal(isJumbo(""), false);
  const row = only(messageRows(rowsOf([message("a", 0, { body: "🔥🔥" })])));
  const text = row.blocks[0] as TextBlock;
  assert.equal(text.jumbo, true);
});

void test("photos and videos are one media block, each with its reactions", () => {
  const video = {
    ...photo("clip.mp4"),
    durationMs: 12_500,
    kind: "video" as const,
    thumbnailUrl: "https://example.com/poster.jpg",
  };
  const file = { ...photo("plans.pdf"), kind: "file" as const, size: 2_400_000 };
  const row = only(
    messageRows(
      rowsOf([
        message("a", 0, {
          attachments: [photo("one.jpg"), file, video, photo("two.jpg", 0, 0)],
          body: "look",
          reactions: [
            { accounts: [ME], count: 1, emoji: "👍", mine: true, part: 2 },
            { accounts: [LEO], count: 1, emoji: "❤️", mine: false, part: "message" },
          ],
        }),
      ]),
    ),
  );
  // Bubbles: the media where the first photo is, the file in place, then
  // the text.
  assert.deepEqual(
    row.blocks.map((block) => block.type),
    ["media", "file", "text"],
  );
  const media = row.blocks[0] as MediaBlock;
  assert.deepEqual(
    media.items.map((item) => [item.kind, item.part]),
    [
      ["image", "0"],
      ["video", "2"],
      ["image", "3"],
    ],
  );
  assert.equal(media.part, undefined);
  assert.equal(media.items[1]?.durationSeconds, 12.5);
  assert.equal(media.items[1]?.thumbnailUrl, "https://example.com/poster.jpg");
  assert.deepEqual(media.items[1]?.reactions, [
    { content: { emoji: "👍" }, count: 1, key: "2 👍", mine: true },
  ]);
  // A photo without a size draws square.
  assert.deepEqual([media.items[2]?.width, media.items[2]?.height], [1000, 1000]);
  // The text's reactions are the row's.
  assert.deepEqual(row.reactions, [
    { content: { emoji: "❤️" }, count: 1, key: "message ❤️", mine: false },
  ]);
  const fileBlock = row.blocks[1];
  assert.equal(fileBlock?.type === "file" && fileBlock.sizeLabel, "2.4 MB");
});

void test("stacked rows put the text first", () => {
  const row = only(
    messageRows(
      rowsOf([message("a", 0, { attachments: [photo("one.jpg")], body: "hi" })], {
        layout: "stacked",
      }),
    ),
  );
  assert.deepEqual(
    row.blocks.map((block) => block.type),
    ["text", "media"],
  );
  // One photo alone is the block's own part.
  assert.equal((row.blocks[1] as MediaBlock).part, "0");
});

void test("a photo without text is the message's own part", () => {
  const row = only(
    messageRows(
      rowsOf([
        message("a", 0, {
          attachments: [photo("one.jpg")],
          body: undefined,
          reactions: [
            { accounts: [LEO], count: 1, emoji: "😂", mine: false, part: "message" },
          ],
        }),
      ]),
    ),
  );
  const media = row.blocks[0] as MediaBlock;
  assert.equal(media.items[0]?.part, "message");
  assert.equal(media.items[0]?.reactions.length, 1);
  // Not shown twice.
  assert.deepEqual(row.reactions, []);
});

void test("link cards, quotes, and footers", () => {
  const rows = messageRows(
    rowsOf([
      message("a", 0, {
        body: "https://youtube.com/watch?v=1",
        linkPreviews: [
          {
            link: "https://youtube.com/watch?v=1",
            preview: {
              siteName: "YouTube",
              title: "A video",
              url: "https://youtube.com/watch?v=1",
            },
          },
          { link: "https://www.example.com/x", preview: null },
        ],
        thread: { repliers: [LEO], replyCount: 3 },
      }),
      message("b", 1, {
        editedAt: new Date(START + 2 * 60_000),
        quote: { authorId: LEO, body: "the original", messageId: "q" },
        status: "failed",
        thread: { repliers: [LEO], replyCount: 2 },
        threadId: "q",
      }),
    ]),
  );
  const [reply, original] = rows;
  assert.deepEqual(
    original?.blocks.map((block) => block.type),
    ["linkCard", "linkCard"],
  );
  const [first, second] = original?.blocks ?? [];
  assert.equal(first?.type === "linkCard" && first.site, "YouTube");
  // Its text is only the link, so the first card is the message.
  assert.equal(first?.part, "message");
  assert.equal(second?.type === "linkCard" && second.site, "example.com");
  assert.equal(second?.part, "link-1");
  assert.deepEqual(
    original?.footer.map((line) => [line.kind, line.text]),
    [["replies", "3 replies"]],
  );
  assert.equal(original?.footer[0]?.people?.[0]?.name, "Leo Park");

  assert.equal(reply?.blocks[0]?.type, "quote");
  const quote = reply?.blocks[0];
  assert.equal(quote?.type === "quote" && quote.messageId, "q");
  assert.equal(quote?.type === "quote" && quote.text, "the original");
  assert.deepEqual(
    reply?.footer.map((line) => [line.kind, line.text]),
    [
      ["replies", "View 1 more reply"],
      ["edited", "Edited"],
      ["notSent", "Not sent. Tap to try again."],
    ],
  );
  assert.equal(reply?.status, "failed");
});

void test("a deleted original is one deleted block", () => {
  const row = only(
    messageRows(
      rowsOf([
        message("a", 0, {
          body: undefined,
          deleted: true,
          thread: { repliers: [], replyCount: 1 },
        }),
      ]),
    ),
  );
  assert.deepEqual(row.blocks, [
    { label: "This message was deleted", type: "deleted" },
  ]);
});

void test("arrivals, the anchor, and the accessibility label", () => {
  const rows = messageRows(
    rowsOf([message("old", 0), message("new", 45)], { anchorId: "old" }),
  );
  const [arrived, old] = rows;
  assert.equal(arrived?.arrived, true);
  assert.equal(old?.arrived, undefined);
  assert.equal(old?.highlighted, true);
  assert.match(old?.accessibilityLabel ?? "", /^Maya Chen, old, /);
});

void test("who's typing is the newest row", () => {
  const rows = rowsOf([message("a", 0)], {}, [MAYA, LEO]);
  const typing = rows[0];
  assert.equal(typing?.kind, "typing");
  if (typing?.kind === "typing") {
    assert.equal(typing.label, "Maya and Leo are typing");
    assert.equal(typing.people.length, 2);
  }
});

void test("notices", () => {
  const shown = context();
  const rows = nativeRows(
    newestFirst([message("a", 0)], "bubbles", undefined, [
      {
        accountId: LEO,
        at: new Date(START + 60_000),
        id: "n1",
        kind: "joined",
        name: "Leo",
      },
    ]),
    [],
    shown,
  );
  assert.deepEqual(rows[0], {
    fallbackText: "Leo joined the conversation",
    id: "n1",
    kind: "notice",
    spans: [
      { style: "bold", text: "Leo" },
      { text: " joined the conversation" },
    ],
  });
});

void test("what a binary can't draw falls back", () => {
  const row = only(
    messageRows(
      rowsOf([message("a", 0, { attachments: [photo("one.jpg")], body: "hi" })]),
    ),
  );
  const noMedia = supported(row, {
    blockTypes: ["text"],
    rowKinds: V1_ROW_KINDS,
  });
  assert.equal(noMedia.kind, "message");
  assert.deepEqual(
    noMedia.kind === "message" &&
      noMedia.blocks.map((block) => block.type === "text" && block.spans[0]?.text),
    ["Photo", "hi"],
  );
  const noMessages = supported(row, {
    blockTypes: V1_BLOCK_TYPES,
    rowKinds: ["header"],
  });
  assert.deepEqual(noMessages, {
    component: "message",
    fallbackText: "Maya Chen: hi, Photo",
    id: "a",
    kind: "custom",
  });
});

void test("reaction keys carry their part", () => {
  assert.deepEqual(parseReactionKey(reactionKey("2", "👍")), {
    emoji: "👍",
    part: 2,
  });
  assert.deepEqual(parseReactionKey(reactionKey("link-1", "❤️")), {
    emoji: "❤️",
    part: "link-1",
  });
  assert.deepEqual(parseReactionKey("🔥"), { emoji: "🔥", part: "message" });
});
