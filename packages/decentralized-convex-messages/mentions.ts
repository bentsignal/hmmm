import type { MutationCtx, QueryCtx } from "./_generated/server.js";
import type { ConversationAccess } from "./model.ts";
import type { Mention } from "./protocol.ts";
import { fail, memberAddresses } from "./model.ts";
import { MAX_MENTIONS } from "./protocol.ts";

const MAX_MENTION_NAME_LENGTH = 80;

/**
 * The mentions that hold: of members other than the author whose `@name`
 * is in the body, each once. Direct messages have none.
 */
export async function validMentions(
  ctx: QueryCtx,
  access: ConversationAccess,
  self: string,
  body: string,
  mentions: readonly Mention[] | undefined,
) {
  if (mentions === undefined || access.conversation.kind === "direct") {
    return [];
  }
  if (mentions.length > MAX_MENTIONS) fail("TOO_MANY_MENTIONS");
  const members = new Set(await memberAddresses(ctx, access.conversation));
  const kept = new Map<string, Mention>();
  for (const { accountId: address, name: written } of mentions) {
    const accountId = address.trim().toLowerCase();
    const name = written.trim();
    if (
      accountId === self ||
      !members.has(accountId) ||
      name.length === 0 ||
      name.length > MAX_MENTION_NAME_LENGTH ||
      !body.includes(`@${name}`)
    ) {
      continue;
    }
    kept.set(`${accountId} ${name}`, { accountId, name });
  }
  return [...kept.values()];
}

/** Notes each account a new message mentions, for their activity. */
export async function recordMentions(
  ctx: MutationCtx,
  message: {
    conversationId: string;
    mentions?: readonly Mention[];
    messageId: string;
    sentAt: number;
  },
) {
  const mentioned = new Set(
    (message.mentions ?? []).map(({ accountId }) => accountId),
  );
  for (const accountId of mentioned) {
    await ctx.db.insert("mentions", {
      accountId,
      conversationId: message.conversationId,
      messageId: message.messageId,
      sentAt: message.sentAt,
    });
  }
}
