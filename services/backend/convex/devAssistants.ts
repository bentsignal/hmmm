import type { Message } from "@decentralized-convex/messages";
import { DECENTRALIZED_CONVEX_VERSION } from "@decentralized-convex/core";
import { v } from "convex/values";

import { components, internal } from "./_generated/api";
import { action, internalMutation } from "./_generated/server";
import { botAccount, botAddress, botIdentity, welcomeAccount } from "./bots";
import { requireCaller } from "./devBots";
import { botName } from "./schema";
import { VERA_WELCOME } from "./vera";

// TEMPORARY, development only: a clean slate for testing Vera's assistants,
// from the Developer section's "Wipe Chat with Vera" (apps/mobile). Refuses
// unless DEV_TOOLS is "true", which production never sets. Remove it before
// the assistants ship; people will get a real way to delete a chat.

/**
 * Deletes every message in the caller's DM with the assistant (each as its
 * author), and everything the assistant kept about it: reply state, memory,
 * saved searches, and, for Vera, their saved notes. Then the assistant says
 * hello again.
 */
export const wipeMine = action({
  args: { bot: botName },
  handler: async (ctx, { bot }) => {
    const { accountId } = await requireCaller(ctx);
    const account = botAccount(bot);
    const self = botAddress(account);
    const conversationId = `direct:${[accountId, self].sort().join(":")}`;
    let deleted = 0;
    for (;;) {
      const page: { messages: Message[] } = await ctx.runQuery(
        internal.bots.page,
        { bot, conversationId },
      );
      const live = page.messages.filter(
        (message) => message.deletedAt === undefined,
      );
      if (live.length === 0) break;
      for (const message of live) {
        await ctx.runMutation(internal.devAssistants.deleteAs, {
          accountId: message.authorId,
          bot,
          conversationId,
          messageId: message.messageId,
        });
        deleted += 1;
      }
    }
    await ctx.runMutation(internal.devAssistants.forget, {
      accountId,
      bot,
      conversationId,
    });
    if (bot === "vera")
      await welcomeAccount(ctx, account, accountId, VERA_WELCOME);
    return { conversationId, deleted };
  },
});

export const deleteAs = internalMutation({
  args: {
    accountId: v.string(),
    bot: botName,
    conversationId: v.string(),
    messageId: v.string(),
  },
  handler: async (ctx, { accountId, bot, conversationId, messageId }) => {
    const account = botAccount(bot);
    const identity =
      accountId === botAddress(account)
        ? botIdentity(account)
        : {
            accountId,
            issuer: "vera-operator",
            subject: accountId,
            tokenIdentifier: `vera-operator|${accountId}`,
          };
    await ctx.runMutation(components.messages.dispatcher.dispatchMutation, {
      identity,
      lastChanged: DECENTRALIZED_CONVEX_VERSION,
      operation: { args: { conversationId, messageId }, type: "deleteMessage" },
      version: DECENTRALIZED_CONVEX_VERSION,
    });
  },
});

export const forget = internalMutation({
  args: { accountId: v.string(), bot: botName, conversationId: v.string() },
  handler: async (ctx, { accountId, bot, conversationId }) => {
    const state = await ctx.db
      .query("botConversations")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();
    const passages = await ctx.db
      .query("memoryPassages")
      .withIndex("by_conversation_last", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();
    const searches = await ctx.db
      .query("webSearches")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();
    const notes = await ctx.db
      .query("botNotes")
      .withIndex("by_bot_account", (q) =>
        q.eq("bot", bot).eq("accountId", accountId),
      )
      .collect();
    for (const passage of passages) {
      const links = await ctx.db
        .query("memoryLinks")
        .withIndex("by_passage", (q) => q.eq("passageId", passage._id))
        .collect();
      await Promise.all(links.map((link) => ctx.db.delete(link._id)));
    }
    await Promise.all(
      [...state, ...passages, ...searches, ...notes].map((row) =>
        ctx.db.delete(row._id),
      ),
    );
  },
});
