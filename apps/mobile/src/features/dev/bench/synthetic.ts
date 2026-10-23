import type { Message } from "~/features/conversation/types";

// A made-up conversation for the list benchmark (see `bench.tsx`): the same
// messages every run (a seeded random), with what real conversations have,
// in about the proportions they have it: text of every length, runs by one
// author, photos, link cards, replies quoting earlier messages, reactions,
// threads, and days apart.

export const BENCH_SELF = "me@bench.vera.chat";

const OTHERS = [
  "maya@bench.vera.chat",
  "jonah@bench.vera.chat",
  "priya@bench.vera.chat",
  "leo@bench.vera.chat",
  "sam@bench.vera.chat",
];

const NAMES = {
  [BENCH_SELF]: "Me",
  "jonah@bench.vera.chat": "Jonah Weiss",
  "leo@bench.vera.chat": "Leo Martins",
  "maya@bench.vera.chat": "Maya Chen",
  "priya@bench.vera.chat": "Priya Natarajan",
  "sam@bench.vera.chat": "Sam Okafor",
} satisfies Record<string, string>;

/** Every account's profile, the same object each time. */
const PROFILES = new Map(
  Object.entries(NAMES).map(([address, displayName]) => [
    address,
    { avatarUrl: null, displayName },
  ]),
);
const UNKNOWN = { avatarUrl: null, displayName: "Someone" };

export function benchProfileOf(address: string) {
  return PROFILES.get(address) ?? UNKNOWN;
}

const WORDS =
  "the a we they it that this just really so maybe yeah okay sure later tonight tomorrow dinner train meeting idea plan photo link song game weekend city coffee ticket flight hotel beach rain sun movie show book code bug build ship test phone laptop call text message group chat send read reply react think know feel want need like love hate try make take give find tell ask work play go come see look".split(
    " ",
  );

/** A small fast seeded random, so every run is the same conversation. */
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function sentence(next: () => number, words: number) {
  const picked = Array.from(
    { length: words },
    () => WORDS[Math.floor(next() * WORDS.length)] ?? "ok",
  );
  const text = picked.join(" ");
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/** Text of a realistic length: mostly short, some long. */
function bodyOf(next: () => number, index: number) {
  const roll = next();
  if (roll < 0.4)
    return `${sentence(next, 1 + Math.floor(next() * 5))} (${String(index)})`;
  if (roll < 0.75) {
    return `${sentence(next, 6 + Math.floor(next() * 12))}. (${String(index)})`;
  }
  if (roll < 0.95) {
    return `${Array.from({ length: 2 + Math.floor(next() * 3) }, () =>
      sentence(next, 8 + Math.floor(next() * 10)),
    ).join(". ")}. (${String(index)})`;
  }
  return `${Array.from({ length: 6 + Math.floor(next() * 5) }, () =>
    sentence(next, 10 + Math.floor(next() * 12)),
  ).join(". ")}. (${String(index)})`;
}

function photo(next: () => number, index: number, part: number) {
  const portrait = next() < 0.4;
  const width = portrait ? 900 : 1200;
  const height = portrait ? 1200 : 800;
  return {
    height,
    kind: "image" as const,
    mimeType: "image/jpeg",
    name: `photo-${String(index)}-${String(part)}.jpg`,
    size: 200_000,
    url: `https://picsum.photos/seed/vera-bench-${String(index)}-${String(part)}/${String(width / 3)}/${String(height / 3)}`,
    width,
  };
}

function reactionsOf(next: () => number) {
  if (next() > 0.15) return [];
  const emoji = ["❤️", "👍", "😂", "🔥", "😮", "🎉"];
  const first = Math.floor(next() * emoji.length);
  return Array.from({ length: 1 + Math.floor(next() * 3) }, (_, at) => {
    const accounts = OTHERS.slice(0, 1 + Math.floor(next() * 3));
    return {
      accounts,
      count: accounts.length,
      emoji: emoji[(first + at) % emoji.length] ?? "❤️",
      mine: false,
      part: "message" as const,
    };
  });
}

/** Who writes next: runs, as the same author keeps going about half the time. */
function nextAuthor(next: () => number, author: string) {
  if (next() <= 0.5) return author;
  return next() < 0.2
    ? BENCH_SELF
    : (OTHERS[Math.floor(next() * OTHERS.length)] ?? BENCH_SELF);
}

function linkOf(index: number) {
  return `https://example.com/story/${String(index)}`;
}

function withLink(body: string | undefined, index: number) {
  return `${body ?? ""} ${linkOf(index)}`;
}

function linkPreviewsOf(next: () => number, index: number) {
  return [
    {
      link: linkOf(index),
      preview: {
        description: sentence(next, 14),
        siteName: "Example News",
        title: sentence(next, 7),
        url: linkOf(index),
      },
    },
  ];
}

/** A reply quoting a message a little before it, in its thread. */
function quoteOf(next: () => number, index: number) {
  return {
    quote: {
      authorId: OTHERS[index % OTHERS.length] ?? BENCH_SELF,
      body: sentence(next, 6),
      messageId: `bench-${String(index - 3)}`,
    },
    threadId: `bench-${String(index - 3)}`,
  };
}

function photosOf(next: () => number, index: number) {
  return Array.from({ length: 1 + Math.floor(next() * 3) }, (_, part) =>
    photo(next, index, part),
  );
}

/** A thread under some messages: two people, a few replies. */
function threadOf(next: () => number) {
  if (next() >= 0.03) return {};
  return {
    thread: {
      repliers: OTHERS.slice(0, 2),
      replyCount: 2 + Math.floor(next() * 5),
    },
  };
}

/** The message numbered `index`, by `author` at `at`. */
function messageAt(
  next: () => number,
  {
    index,
    author,
    at,
    quotes,
  }: { index: number; author: string; at: number; quotes: boolean },
) {
  const roll = next();
  const photos = roll < 0.06 ? photosOf(next, index) : [];
  const linked = roll >= 0.06 && roll < 0.11;
  const quoted = roll >= 0.11 && roll < 0.21 && quotes;
  const body =
    photos.length > 0 && next() < 0.5 ? undefined : bodyOf(next, index);
  return {
    attachments: photos,
    authorId: author,
    body: linked ? withLink(body, index) : body,
    id: `bench-${String(index)}`,
    reactions: reactionsOf(next),
    sentAt: new Date(at),
    ...(linked && { linkPreviews: linkPreviewsOf(next, index) }),
    ...(quoted && quoteOf(next, index)),
    ...threadOf(next),
  } satisfies Message;
}

/**
 * `count` messages ending at `endAt`, oldest first, made from `seed`. `from`
 * numbers them, so pages made separately join up (older pages count down).
 */
export function benchMessages({
  count,
  endAt = Date.UTC(2026, 9, 21, 18),
  from = 0,
  seed = 1,
}: {
  count: number;
  endAt?: number;
  from?: number;
  seed?: number;
}) {
  const next = random(seed + from * 7919);
  const messages = new Array<Message>();
  let author = OTHERS[0] ?? BENCH_SELF;
  let at = endAt;
  // Built newest first, walking back in time, then reversed.
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const index = from + offset;
    author = nextAuthor(next, author);
    messages.push(
      messageAt(next, { at, author, index, quotes: messages.length > 0 }),
    );
    // Seconds to minutes apart, with the odd day between.
    at -= next() < 0.01 ? 26 * 60 * 60 * 1000 : 5_000 + next() * 240_000;
  }
  return messages.reverse();
}
