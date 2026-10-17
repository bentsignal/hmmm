import type { TestContext } from "node:test";

import { fakeCtx } from "./fakeCtx.ts";
import { recordMentions } from "./mentions.ts";
import { addReply, replyTo } from "./threads.ts";

// Tests only: a group with three members, and messages sent in it. The
// second dot in its name keeps Convex from bundling it as a module.

export const ME = "me@vera.chat";
export const MAYA = "maya@vera.chat";
export const LEO = "leo@vera.chat";
export const GROUP = "group:vera.chat:1";
const HOUR = 60 * 60 * 1000;
export const NOW = 30 * 24 * HOUR;

export function setup(t: TestContext) {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const fake = fakeCtx({
    conversations: [
      { conversationId: GROUP, createdBy: ME, kind: "group", updatedAt: 0 },
    ],
    members: [ME, MAYA, LEO].map((accountId) => ({
      accountId,
      conversationId: GROUP,
      lastReadAt: 0,
      muted: false,
      role: "member",
    })),
  });
  /**
   * Stores a message as `send` does, a minute after the last one. (`send`
   * itself schedules pushes, which these tests can't load.)
   */
  async function say(
    author: string,
    messageId: string,
    threadId?: string,
    {
      mentions,
      threadOnly,
    }: {
      mentions?: { accountId: string; name: string }[];
      threadOnly?: boolean;
    } = {},
  ) {
    t.mock.timers.tick(60_000);
    const sentAt = Date.now();
    const reply =
      threadId === undefined
        ? undefined
        : await replyTo(fake.ctx, GROUP, threadId, threadOnly);
    const message = {
      attachments: [],
      authorId: author,
      authorName: author,
      body: `${messageId} from ${author}`,
      conversationId: GROUP,
      mentions,
      messageId,
      quote: reply?.quote,
      sentAt,
      threadId: reply?.threadId,
      threadOnly: reply?.threadOnly,
    };
    await fake.ctx.db.insert("messages", message);
    await recordMentions(fake.ctx, message);
    if (reply !== undefined) {
      await addReply(fake.ctx, { ...reply, authorId: author, sentAt });
    }
    return message;
  }
  return { ...fake, say };
}
