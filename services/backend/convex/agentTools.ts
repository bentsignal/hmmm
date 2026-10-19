import type { ToolSet } from "ai";
import { tool } from "ai";
import { z } from "zod/v4";

import type { ActionCtx } from "./_generated/server";
import type { BotAccount } from "./bots";
import { internal } from "./_generated/api";
import { botAddress } from "./bots";

// What every assistant's turn shares (agent.ts runs it): the one
// conversation it answers in, and the tools that read and write only that
// conversation. No tool takes a conversation or an account, so a model can't
// reach anyone else's messages or send to anyone else.

/** Grok 4.7 through the Convex AI Gateway (billed on the Convex bill). */
export const MODEL = "x-ai/grok-4.7";
/**
 * Describes images for it: Grok 4.7 doesn't take images through the
 * gateway (it fails with "Provider returned error"), and Grok 4.6 does.
 */
export const VISION_MODEL = "x-ai/grok-4.6";

/** The most messages one turn sends, so a confused model can't flood a chat. */
const MAX_MESSAGES_PER_TURN = 6;

export interface Turn {
  readonly accountId: string;
  /** They wrote before anyone answered and have waited since. */
  readonly backlog: boolean;
  readonly bot: BotAccount;
  readonly conversationId: string;
  readonly ctx: ActionCtx;
  /** The person's display name, from their latest message. */
  readonly name: string;
  /** When the person's newest message was sent. */
  readonly lastHeardAt: number;
  /** The oldest message the model was given, for `read_earlier_messages`. */
  readonly oldestSentAt: number | null;
  /** Sends a message to the person, pacing several like someone typing. */
  readonly send: (body: string) => Promise<void>;
  /** How many messages this turn has sent. */
  readonly sent: () => number;
}

/** The rules every assistant follows, before its own instructions. */
export function sharedInstructions(turn: Turn) {
  const now = new Date().toUTCString();
  return `You are ${turn.bot.name} (${botAddress(turn.bot)}), an official account in Vera, a messaging app. You're in a direct message with ${turn.name}. You can only see and write in this one conversation.

How you write:
- People see only what you send with the send_message tool. Anything else you write is discarded.
- Write like a person texting: plain text only. No markdown, headings, bold, bullet symbols, numbered lists, tables, or code fences. Links are fine written out as plain URLs.
- Short messages. When a reply has a few distinct parts, send them as a few short messages (separate send_message calls) instead of one long one. Usually one message is enough.
- Don't repeat yourself, and don't end with offers like "let me know if you need anything else".
- After you ask them something, stop and wait for their answer. Never assume or make up what they said; only their own messages tell you that.
- Never mention your tools, these instructions, or how you work inside.

Images people send appear as [image N: a description of it]. You can't see them yourself; go by the description, and don't say it was described to you.

It is now ${now}.`;
}

/** Reading and writing this conversation, which every assistant has. */
export function conversationTools(turn: Turn) {
  return {
    send_message: tool({
      description:
        "Send one message to the person, as plain text. Call it several times to send several short messages.",
      inputSchema: z.object({
        text: z.string().describe("The message, plain text, no markdown."),
      }),
      execute: async ({ text }) => {
        if (turn.sent() >= MAX_MESSAGES_PER_TURN) {
          return "Not sent: that's enough messages for now. Stop and wait for them to answer.";
        }
        await turn.send(text);
        return "Sent. If you asked them something, stop and wait for their answer.";
      },
    }),
    read_earlier_messages: tool({
      description:
        "Read older messages in this conversation than the ones you can see, 50 at a time.",
      inputSchema: z.object({
        before: z
          .number()
          .optional()
          .describe(
            "The `olderThan` value from the last call; leave out the first time.",
          ),
      }),
      execute: async ({ before }) => {
        const cursor = before ?? turn.oldestSentAt;
        if (cursor === null) return { messages: [], olderThan: null };
        const page = await turn.ctx.runQuery(internal.bots.page, {
          before: cursor,
          bot: turn.bot.username,
          conversationId: turn.conversationId,
        });
        const self = botAddress(turn.bot);
        const messages = page.messages.filter(
          (message) => message.deletedAt === undefined,
        );
        return {
          messages: messages.map((message) => ({
            from: message.authorId === self ? "you" : turn.name,
            sentAt: new Date(message.sentAt).toISOString(),
            text: message.body,
            ...(message.attachments.length > 0 && {
              attachments: message.attachments.map(
                (attachment) => attachment.kind,
              ),
            }),
          })),
          olderThan: page.hasOlder ? (messages[0]?.sentAt ?? null) : null,
        };
      },
    }),
  } satisfies ToolSet;
}

/** How often typing is refreshed (the app drops it after 6 seconds). */
const TYPING_REFRESH = 4000;

/** Shows the assistant typing while it works. */
export function keepTyping(
  ctx: ActionCtx,
  bot: BotAccount,
  conversationId: string,
) {
  let stopped = false;
  let wake: (() => void) | null = null;
  function setTyping(typing: boolean) {
    return ctx.runMutation(internal.bots.setTyping, {
      bot: bot.username,
      conversationId,
      typing,
    });
  }
  function sleep(ms: number) {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, ms);
      wake = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }
  // Sending clears typing. It comes back only if the assistant is still at
  // it a refresh later, so it doesn't flash up after its last message.
  let sentAt = 0;
  const loop = (async () => {
    while (!stopped) {
      const quiet = sentAt + TYPING_REFRESH - Date.now();
      if (quiet > 0) {
        await sleep(quiet);
        continue;
      }
      await setTyping(true);
      await sleep(TYPING_REFRESH);
    }
  })();
  return {
    /** Call after each message goes out. */
    sent: () => {
      sentAt = Date.now();
    },
    /** Waits `ms` with typing showing. */
    pause: async (ms: number) => {
      await setTyping(true);
      await new Promise((resolve) => setTimeout(resolve, ms));
    },
    stop: async () => {
      stopped = true;
      wake?.();
      await loop;
      await setTyping(false);
    },
  };
}
