import type {
  Behavior,
  Block,
  MediaItem,
  MessageRow,
  Person,
  Reaction,
  Row,
  Theme,
} from "./contract";

// Made-up rows for building and checking the native list on its own
// (`/dev-native-list`), before the app's messages are mapped to it: every
// row kind and block type, both layouts, in a varied mix like a real
// group chat (photos, videos, link cards, reactions). `heavy` makes almost
// every message media, for flinging through hundreds of photos.

const PEOPLE: readonly Person[] = [
  { avatarUrl: null, id: "maya", initials: "MC", name: "Maya Chen" },
  { avatarUrl: null, id: "jonah", initials: "JW", name: "Jonah Weiss" },
  {
    avatarUrl: "https://picsum.photos/id/64/200/200",
    id: "priya",
    initials: "PN",
    name: "Priya Natarajan",
  },
  { avatarUrl: null, id: "me", initials: "ME", name: "Me" },
];

const LINES = [
  "Is anyone around this weekend?",
  "Probably, depends on the weather",
  "I'm in",
  "Count me in too, I can bring snacks and the speaker. Also the folding chairs if we're doing the park again, they're still in my trunk from last time",
  "lol",
  "😂😂",
  "Did you see this?",
  "That's wild",
  "Running ten minutes late, sorry",
  "Same",
];

function photo(
  seed: number,
  index: number,
  width = 1200,
  height = 900,
): MediaItem {
  const id = (seed * 7 + index) % 80;
  return {
    height,
    id: `p${seed}-${index}`,
    kind: "image",
    part: `attachment:p${seed}-${index}`,
    reactions: index === 1 ? [thumbs(1, false)] : [],
    thumbnailUrl: `https://picsum.photos/id/${id}/${Math.round(width / 3)}/${Math.round(height / 3)}`,
    url: `https://picsum.photos/id/${id}/${width}/${height}`,
    width,
  };
}

function video(seed: number): MediaItem {
  return {
    ...photo(seed, 0, 1280, 720),
    durationSeconds: 42 + (seed % 90),
    id: `v${seed}`,
    kind: "video",
    part: `attachment:v${seed}`,
    reactions: [],
  };
}

function thumbs(count: number, mine: boolean): Reaction {
  return { content: { emoji: "👍" }, count, key: "👍", mine };
}

function text(value: string): Block {
  return { part: "message", spans: [{ text: value }], type: "text" };
}

function blocksFor(index: number, heavy: boolean): Block[] {
  const line = LINES[index % LINES.length] ?? "";
  if (heavy) {
    switch (index % 5) {
      case 0:
        return [
          {
            items: [0, 1, 2, 3, 4].map((item) =>
              photo(index, item, 900 + item * 150, 1200),
            ),
            type: "media",
          },
        ];
      case 1:
        return [{ items: [video(index)], type: "media" }];
      case 2:
        return [text(line), { items: [photo(index, 0)], type: "media" }];
      case 3:
        return [
          { items: [photo(index, 0, 900, 1200)], type: "media" },
          {
            description: "A video everyone needs to see",
            imageHeight: 360,
            imageUrl: `https://picsum.photos/id/${index % 80}/640/360`,
            imageWidth: 640,
            site: "youtube.com",
            title: "The best video",
            type: "linkCard",
            url: "https://youtube.com",
          },
        ];
      default:
        return [
          {
            items: [0, 1, 2].map((item) => photo(index, item, 1200, 900)),
            type: "media",
          },
        ];
    }
  }
  switch (index % 17) {
    case 2:
      return [
        {
          items: [photo(index, 0)],
          part: `attachment:p${index}-0`,
          type: "media",
        },
      ];
    case 4:
      return [
        text(line),
        {
          items: [0, 1, 2, 3].map((item) =>
            photo(index, item, 900 + item * 100, 1200),
          ),
          type: "media",
        },
      ];
    case 5:
      return [
        {
          part: "message",
          spans: [
            { text: "Look at this " },
            {
              style: "link",
              text: "youtube.com/watch?v=x",
              url: "https://youtube.com",
            },
          ],
          type: "text",
        },
        {
          description: "A video everyone needs to see",
          imageHeight: 360,
          imageUrl: "https://picsum.photos/id/20/640/360",
          imageWidth: 640,
          site: "youtube.com",
          title: "The best video",
          type: "linkCard",
          url: "https://youtube.com",
        },
      ];
    case 6:
      return [
        {
          jumbo: true,
          part: "message",
          spans: [{ text: "😂😂" }],
          type: "text",
        },
      ];
    case 7:
      return [
        {
          author: PEOPLE[0] as Person,
          messageId: "quoted",
          text: "Is anyone around this weekend?",
          type: "quote",
        },
        {
          part: "message",
          spans: [
            { text: "Me! " },
            { accountId: "maya", style: "mention", text: "@Maya" },
          ],
          type: "text",
        },
      ];
    case 8:
      return [
        {
          name: "plans.pdf",
          part: "attachment:f",
          sizeLabel: "2.4 MB",
          type: "file",
          url: "https://example.com",
        },
      ];
    case 9:
      return [{ items: [video(index)], type: "media" }];
    case 10:
      return [
        {
          part: "message",
          spans: [
            { text: "Some " },
            { style: "bold", text: "bold" },
            { text: ", some " },
            { style: "italic", text: "italic" },
            { text: ", and " },
            { style: "code", text: "code()" },
            { text: ", all in one message that wraps onto a second line." },
          ],
          type: "text",
        },
      ];
    case 11:
      return [{ label: "This message was deleted", type: "deleted" }];
    case 12:
      return [
        {
          author: PEOPLE[2] as Person,
          messageId: "quoted-photo",
          text: "Photo",
          thumbnailUrl: "https://picsum.photos/id/10/120/120",
          type: "quote",
        },
        text("Where was this taken?"),
      ];
    case 13:
      return [
        {
          items: [{ ...photo(index, 0), uploading: true }],
          type: "media",
        },
      ];
    case 14:
      // A block type this binary doesn't know: drawn as `fallbackText`.
      return [{ type: "poll" } as unknown as Block];
    default:
      return [text(line)];
  }
}

/** Who sent the message `index` back: runs of two, then someone else. */
function authorOf(index: number): Person {
  return PEOPLE[Math.floor(index / 2) % 4] as Person;
}

/** A message, `index` back from the newest. */
export function fixtureMessage(
  index: number,
  layout: "bubbles" | "stacked",
  sentAt: number,
  arrived = false,
  heavy = false,
  authorOverride?: Person,
): MessageRow {
  const author = authorOverride ?? authorOf(index);
  const blocks = blocksFor(index, heavy);
  const failed = !heavy && index % 29 === 15;
  return {
    accessibilityLabel: `${author.name}: ${LINES[index % LINES.length] ?? ""}`,
    arrived,
    author,
    blocks,
    endsGroup: true,
    fallbackText:
      !heavy && index % 17 === 14 ? "A poll: update Vera to see it" : undefined,
    footer: failed
      ? [{ kind: "notSent", text: "Not sent. Tap to try again." }]
      : index % 11 === 3
        ? [
            {
              kind: "replies",
              people: [PEOPLE[1] as Person, PEOPLE[2] as Person],
              text: "2 replies",
            },
          ]
        : index % 13 === 5
          ? [{ kind: "edited", text: "Edited" }]
          : [],
    highlighted: index === 30,
    id: `m${index}`,
    isOwn: author.id === "me",
    kind: "message",
    layout,
    reactions:
      index % 4 === 1
        ? [
            thumbs(2, index % 8 === 1),
            { content: { emoji: "❤️" }, count: 1, key: "❤️", mine: false },
          ]
        : index % 23 === 7
          ? [
              { content: { emoji: "😂" }, count: 3, key: "😂", mine: true },
              { content: { emoji: "🔥" }, count: 2, key: "🔥", mine: false },
            ]
          : [],
    sentAt,
    showAuthor: layout === "stacked" || author.id !== "me",
    startsGroup: true,
    status: failed ? "failed" : index === 1 && !heavy ? "sending" : undefined,
    timeLabel: new Date(sentAt).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

/** `count` rows, newest first, starting `from` messages back. */
export function fixtureRows(
  count: number,
  from: number,
  layout: "bubbles" | "stacked",
  heavy = false,
): Row[] {
  const now = Date.now();
  const messages: MessageRow[] = [];
  for (let index = from; index < from + count; index += 1) {
    messages.push(fixtureMessage(index, layout, now - index * 7 * 60_000, false, heavy));
  }
  const rows: Row[] = [];
  messages.forEach((message, position) => {
    // Runs: the same author in a row, newest first in the array.
    const newer = messages[position - 1];
    const older = messages[position + 1];
    const index = from + position;
    const breakAbove = index % 12 === 11 || index % 37 === 20;
    const startsGroup =
      breakAbove || older === undefined || older.author.id !== message.author.id;
    const endsGroup =
      newer === undefined ||
      newer.author.id !== message.author.id ||
      (index - 1) % 12 === 11 ||
      (index - 1) % 37 === 20;
    rows.push({ ...message, endsGroup, startsGroup });
    if (index % 12 === 11) {
      rows.push({
        id: `h${index}`,
        kind: "header",
        label: `Today ${message.timeLabel}`,
        style: layout === "bubbles" ? "time" : "day",
      });
    }
    if (index % 37 === 20) {
      rows.push({
        id: `n${index}`,
        kind: "notice",
        spans: [
          { style: "bold", text: "Leo" },
          { text: " joined the conversation" },
        ],
      });
    }
    if (index % 41 === 25 && !heavy) {
      rows.push({
        component: "Poll",
        fallbackText: "A poll: update Vera to see it",
        id: `c${index}`,
        kind: "custom",
      });
    }
  });
  return rows;
}

export const FIXTURE_TYPING: Row = {
  id: "typing",
  kind: "typing",
  label: "Maya is typing",
  layout: "bubbles",
  people: [PEOPLE[0] as Person],
};

/** Maya and Priya typing. */
export const FIXTURE_TYPING_TWO: Row = {
  id: "typing",
  kind: "typing",
  label: "Maya and Priya are typing",
  layout: "bubbles",
  people: [PEOPLE[0] as Person, PEOPLE[2] as Person],
};

export const FIXTURE_PEOPLE = PEOPLE;

/** The light theme, as the app's CSS variables have it (global.css). */
export const FIXTURE_THEME: Theme = {
  colors: {
    accent: "#007aff",
    background: "#ffffff",
    backgroundElevated: "#ffffff",
    bubbleIncoming: "#e9e9eb",
    bubbleOutgoing: "#007aff",
    destructive: "#ff3b30",
    fill: "rgba(118, 118, 128, 0.12)",
    foreground: "#000000",
    highlight: "rgba(124, 124, 255, 0.18)",
    monogramBottom: "#858994",
    monogramTop: "#a6abb8",
    muted: "rgba(60, 60, 67, 0.6)",
    onAccent: "#ffffff",
    separator: "rgba(60, 60, 67, 0.29)",
    subtle: "rgba(60, 60, 67, 0.3)",
    textIncoming: "#000000",
    textOutgoing: "#ffffff",
  },
  metrics: {
    avatarSize: 36,
    bubbleMaxWidthFraction: 0.75,
    bubbleRadius: 20,
    horizontalPadding: 16,
    rowGap: 4,
    runGap: 14,
  },
  type: {
    body: { lineHeight: 22, size: 17 },
    caption: { lineHeight: 16, size: 12 },
    footnote: { lineHeight: 18, size: 13 },
    jumbo: { lineHeight: 44, size: 40 },
    name: { lineHeight: 16, size: 12 },
  },
};

/** The dark theme (global.css's dark variant). */
export const FIXTURE_THEME_DARK: Theme = {
  ...FIXTURE_THEME,
  colors: {
    accent: "#0a84ff",
    background: "#000000",
    backgroundElevated: "#1c1c1e",
    bubbleIncoming: "#26252a",
    bubbleOutgoing: "#0a84ff",
    destructive: "#ff453a",
    fill: "rgba(118, 118, 128, 0.24)",
    foreground: "#ffffff",
    highlight: "rgba(124, 124, 255, 0.18)",
    monogramBottom: "#858994",
    monogramTop: "#a6abb8",
    muted: "rgba(235, 235, 245, 0.6)",
    onAccent: "#ffffff",
    separator: "rgba(84, 84, 88, 0.65)",
    subtle: "rgba(235, 235, 245, 0.3)",
    textIncoming: "#ffffff",
    textOutgoing: "#ffffff",
  },
};

export const FIXTURE_BEHAVIOR: Behavior = {
  fadeMs: 400,
  firehoseFrom: 8,
  firehoseUntil: 3,
  firehoseWindowMs: 2000,
  loadAheadScreens: 10,
  moveMs: 420,
  nearLatestPoints: 80,
};
