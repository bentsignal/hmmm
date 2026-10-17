// Messages to render: a page of them between you and Maya, and the changes
// a conversation sees (a new message, a reaction, an older page).
import type { Message } from "~/features/conversation/types";

export const SELF = "me@vera.test";
export const OTHER = "maya@vera.test";

const START = Date.UTC(2026, 9, 1, 12);

export function message(index: number, overrides: Partial<Message> = {}) {
  return {
    attachments: [],
    authorId: index % 3 === 0 ? SELF : OTHER,
    body: `Message ${index}`,
    id: `m${index}`,
    reactions: [],
    sentAt: new Date(START + index * 60_000),
    ...overrides,
  } satisfies Message;
}

/** A page of messages, oldest first. */
export const PAGE = Array.from({ length: 50 }, (_, index) => message(index));

/** `messages` with Maya's ❤️ on the one with ID `id`. */
export function withReaction(messages: readonly Message[], id: string) {
  return messages.map((item) =>
    item.id === id
      ? {
          ...item,
          reactions: [
            {
              accounts: [OTHER],
              count: 1,
              emoji: "❤️",
              mine: false,
              part: "message" as const,
            },
          ],
        }
      : item,
  );
}

/** Older messages before `PAGE`. */
export const OLDER = Array.from({ length: 50 }, (_, index) =>
  message(index - 50),
);
