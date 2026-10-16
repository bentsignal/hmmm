// A conversation to render: a page of messages between you and Maya, and
// the list showing them as the conversation screen would.
import type { Message } from "~/features/conversation/types";
import { MessageList } from "~/features/conversation/message-list";

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
            { accounts: [OTHER], count: 1, emoji: "❤️", mine: false },
          ],
        }
      : item,
  );
}

/** Older messages before `PAGE`. */
export const OLDER = Array.from({ length: 50 }, (_, index) =>
  message(index - 50),
);

/** The same profile object each time, as `useProfileState` gives. */
const profile = { avatarUrl: null, displayName: "Maya" };
function profileOf() {
  return profile;
}

export function Conversation({ messages }: { messages: readonly Message[] }) {
  return (
    <MessageList
      messages={messages}
      self={SELF}
      layout="bubbles"
      profileOf={profileOf}
      showAuthors
      hasNewer={false}
      onLoadOlder={() => undefined}
      onLoadNewer={() => undefined}
      onJumpToLatest={() => undefined}
      bottomInset={0}
      topInset={0}
      composerHeight={56}
      onToggleReaction={() => undefined}
      onViewReactions={() => undefined}
    />
  );
}
