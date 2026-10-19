import type { PdsRouterMutation } from "@decentralized-convex/server";

import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { ASSISTANTS, botAddress, field, VERA } from "./bots";

// What starts an assistant's work: the PDS router's `afterMutation`
// (pds.ts) sees every write someone on this PDS makes, and reacts to the
// ones in a direct conversation with an assistant.

/** How long a reply waits for more messages, so a burst gets one answer. */
const REPLY_DELAY = 1500;

/**
 * The router's `afterMutation` (pds.ts): when someone on this PDS sends a
 * direct message to an assistant, its reply runs after a short pause. A
 * newer message moves the reply later, so it answers them together.
 */
export async function afterPdsMutation(
  ctx: MutationCtx,
  { identity, operation, plugin }: PdsRouterMutation,
) {
  if (plugin !== "messages" || identity === null) return;
  const type = field(operation, "type");
  const conversationId = field(field(operation, "args"), "conversationId");
  if (typeof conversationId !== "string") return;
  if (!conversationId.startsWith("direct:")) return;
  if (type === "editMessage" || type === "deleteMessage") {
    await forgetChangedMessage(ctx, conversationId, operation);
    return;
  }
  if (type !== "send" || identity.accountId === undefined) return;
  await startReply(ctx, conversationId, identity.accountId);
}

/** Schedules an assistant's reply to someone's direct message to it. */
async function startReply(
  ctx: MutationCtx,
  conversationId: string,
  author: string,
) {
  const members = conversationId.slice("direct:".length).split(":");
  if (!members.includes(author)) return;
  const bot = ASSISTANTS.find(
    (candidate) =>
      botAddress(candidate) !== author &&
      members.includes(botAddress(candidate)),
  );
  if (bot === undefined) return;
  const wakeAt = Date.now() + REPLY_DELAY;
  const existing = await ctx.db
    .query("botConversations")
    .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
    .unique();
  if (existing === null) {
    await ctx.db.insert("botConversations", {
      accountId: author,
      bot: bot.username,
      conversationId,
      wakeAt,
    });
  } else {
    await ctx.db.patch(existing._id, { wakeAt });
  }
  await ctx.scheduler.runAfter(REPLY_DELAY, internal.agent.run, {
    conversationId,
    wakeAt,
  });
}

/**
 * An edited or deleted message in a DM with Vera: its memory passage is
 * rebuilt from what the conversation says now (memory.ts).
 */
async function forgetChangedMessage(
  ctx: MutationCtx,
  conversationId: string,
  operation: unknown,
) {
  if (!conversationId.split(":").includes(botAddress(VERA))) return;
  const messageId = field(field(operation, "args"), "messageId");
  if (typeof messageId !== "string") return;
  await ctx.scheduler.runAfter(0, internal.memoryBuild.rebuild, { messageId });
}
