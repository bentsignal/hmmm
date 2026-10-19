import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { isBotAddress, queryAsBot, SUPPORT } from "./bots";

// A one-time pass over support's inbox from before its model answered
// anyone: people who wrote in and never heard back. Support's model reads
// each conversation, checks what's already reported or fixed, and answers
// (supportAgent.ts, `BACKLOG`). These go to real people: ask Shawn first.

interface Waiting {
  accountId: string;
  conversationId: string;
  lastMessage: string;
  sentAt: string;
  sentAtMs: number;
}

/** Seconds between conversations, so they don't all call the model at once. */
const SPACING = 30_000;

/**
 * Operator command: `npx convex run supportBacklog:pending`. Conversations
 * whose newest message is from the person and that support's model has
 * never answered, oldest first.
 */
export const pending = internalQuery({
  args: {},
  handler: async (ctx): Promise<Waiting[]> => {
    const response = await queryAsBot(ctx, SUPPORT, { args: {}, type: "inbox" });
    if (response.type !== "inbox") throw new Error("Unexpected response");
    const waiting: Waiting[] = [];
    for (const conversation of response.value) {
      const last = conversation.lastMessage;
      if (conversation.kind !== "direct" || last === null) continue;
      // Theirs, not support's or another bot's.
      if (isBotAddress(last.authorId)) continue;
      const handled = await ctx.db
        .query("botConversations")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation.conversationId),
        )
        .unique();
      if (handled !== null) continue;
      waiting.push({
        accountId: last.authorId,
        conversationId: conversation.conversationId,
        lastMessage: last.body,
        sentAt: new Date(last.sentAt).toISOString(),
        sentAtMs: last.sentAt,
      });
    }
    return waiting.sort((a, b) => a.sentAtMs - b.sentAtMs);
  },
});

/**
 * Operator command: `npx convex run supportBacklog:answerAll`. Has support
 * answer every pending conversation, one every 30 seconds. Messages real
 * people: run `pending` first and ask Shawn.
 */
export const answerAll = internalMutation({
  args: { conversationIds: v.optional(v.array(v.string())) },
  handler: async (ctx, { conversationIds }): Promise<{ answering: number }> => {
    const all: Waiting[] = await ctx.runQuery(internal.supportBacklog.pending, {});
    const waiting = all.filter(
      (conversation) =>
        conversationIds === undefined ||
        conversationIds.includes(conversation.conversationId),
    );
    const now = Date.now();
    for (const [index, conversation] of waiting.entries()) {
      const wakeAt = now + index * SPACING;
      await ctx.db.insert("botConversations", {
        accountId: conversation.accountId,
        backlog: true,
        bot: SUPPORT.username,
        conversationId: conversation.conversationId,
        dayStart: now,
        runsToday: 0,
        wakeAt,
      });
      await ctx.scheduler.runAt(wakeAt, internal.agent.run, {
        conversationId: conversation.conversationId,
        wakeAt,
      });
    }
    return { answering: waiting.length };
  },
});
