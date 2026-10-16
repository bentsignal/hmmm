import type { QueryCtx } from "./_generated/server.js";

// What a conversation itself shows: every message but the replies kept in
// their threads.

const MAX_UNREAD = 99;

/** The newest message the conversation shows (not one kept in a thread). */
export function latestMessage(ctx: QueryCtx, conversationId: string) {
  return ctx.db
    .query("messages")
    .withIndex("by_chat_sent", (index) =>
      index.eq("conversationId", conversationId).eq("threadOnly", undefined),
    )
    .order("desc")
    .first();
}

export async function unreadCount(
  ctx: QueryCtx,
  conversationId: string,
  accountId: string,
  lastReadAt: number,
) {
  const unread = await ctx.db
    .query("messages")
    .withIndex("by_chat_sent", (index) =>
      index
        .eq("conversationId", conversationId)
        .eq("threadOnly", undefined)
        .gt("sentAt", lastReadAt),
    )
    .take(MAX_UNREAD + 1);
  return unread.filter((message) => message.authorId !== accountId).length;
}
