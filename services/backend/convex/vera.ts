import { tool } from "ai";
import { v } from "convex/values";
import { z } from "zod/v4";

import type { Assistant } from "./agent";
import type { Turn } from "./agentTools";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { conversationTools, sharedInstructions } from "./agentTools";
import {
  botAddress,
  ensureBotAccount,
  isBotAddress,
  SUPPORT,
  VERA,
  welcomeAccount,
  welcomeEveryAccount,
} from "./bots";

// Vera: a general assistant anyone on this PDS can message
// (`vera@<account domain>`). It answers questions, briefly by default, and
// remembers how each person likes it to answer when they ask it to.

const WELCOME_MESSAGE =
  "Hi, I'm Vera, an AI assistant. Ask me anything, anytime.";

/** The most notes Vera keeps for one person, and how long each can be. */
const MAX_NOTES = 30;
const MAX_NOTE_LENGTH = 300;

export const veraAssistant: Assistant = {
  instructions: async (turn) => {
    const notes: { id: string; text: string }[] = await turn.ctx.runQuery(
      internal.vera.notes,
      {
        accountId: turn.accountId,
      },
    );
    const saved =
      notes.length === 0
        ? "None yet."
        : notes.map((note) => `- [${note.id}] ${note.text}`).join("\n");
    return `${sharedInstructions(turn)}

You are Vera, the AI assistant in the Vera app. Answer what was asked, directly. No preamble, no restating the question, no filler. A sentence or two is usually enough; write more only when they ask for detail or the question really needs it. Don't write walls of text. Match their tone and language.

What ${turn.name} has asked you to keep in mind (follow these over the defaults above):
${saved}

When they tell you how they want you to answer (longer, more casual, in another language) or something about themselves they want you to remember, save it with remember. When they change their mind, update or remove it with forget. Only save what they asked you to, or clearly want kept; never save anything sensitive unless they ask you to. Confirm briefly.

You can't browse the web, see their other chats, or do things in the app for them. If you don't know something, say so. For bugs or problems with the app, tell them to message Vera Support (${botAddress(SUPPORT)}).`;
  },
  tools: (turn: Turn) => ({
    ...conversationTools(turn),
    remember: tool({
      description:
        "Save something this person asked you to keep in mind, such as how they like answers.",
      inputSchema: z.object({
        text: z.string().describe("One short note, in your own words."),
      }),
      execute: async ({ text }) =>
        turn.ctx.runMutation(internal.vera.remember, {
          accountId: turn.accountId,
          text,
        }),
    }),
    forget: tool({
      description: "Remove a saved note by its ID.",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) =>
        turn.ctx.runMutation(internal.vera.forget, {
          accountId: turn.accountId,
          id,
        }),
    }),
  }),
};

export const notes = internalQuery({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) => {
    const rows = await ctx.db
      .query("botNotes")
      .withIndex("by_bot_account", (q) =>
        q.eq("bot", "vera").eq("accountId", accountId),
      )
      .take(MAX_NOTES);
    return rows.map((row) => ({ id: row._id, text: row.text }));
  },
});

export const remember = internalMutation({
  args: { accountId: v.string(), text: v.string() },
  handler: async (ctx, { accountId, text }) => {
    const trimmed = text.trim().slice(0, MAX_NOTE_LENGTH);
    if (trimmed.length === 0) return "Nothing to save.";
    const existing = await ctx.db
      .query("botNotes")
      .withIndex("by_bot_account", (q) =>
        q.eq("bot", "vera").eq("accountId", accountId),
      )
      .take(MAX_NOTES);
    if (existing.length >= MAX_NOTES) {
      return "Not saved: that's the most notes you can keep. Forget one first.";
    }
    const id = await ctx.db.insert("botNotes", {
      accountId,
      bot: "vera",
      text: trimmed,
    });
    return `Saved as ${id}.`;
  },
});

export const forget = internalMutation({
  args: { accountId: v.string(), id: v.string() },
  handler: async (ctx, { accountId, id }) => {
    const noteId = ctx.db.normalizeId("botNotes", id);
    const note = noteId === null ? null : await ctx.db.get(noteId);
    // Only this person's own notes.
    if (note?.accountId !== accountId || note.bot !== "vera") {
      return "No note with that ID.";
    }
    await ctx.db.delete(note._id);
    return "Forgotten.";
  },
});

/** Operator command: `npx convex run vera:setup`. Safe to run again. */
export const setup = internalAction({
  args: {},
  handler: (ctx) => ensureBotAccount(ctx, VERA),
});

/** Vera says hello to a new account. Scheduled whenever one is created. */
export const welcome = internalAction({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) => {
    if (isBotAddress(accountId)) return;
    await ensureBotAccount(ctx, VERA);
    await welcomeAccount(ctx, VERA, accountId, WELCOME_MESSAGE);
  },
});

/**
 * Operator command: `npx convex run vera:welcomeEveryone`. Says hello to
 * accounts made before Vera existed; accounts it already wrote to are
 * skipped. On production this messages every account: ask Shawn first.
 */
export const welcomeEveryone = internalAction({
  args: {},
  handler: (ctx) => welcomeEveryAccount(ctx, VERA, WELCOME_MESSAGE),
});
