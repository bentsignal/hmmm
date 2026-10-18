import type { ActionCtx } from "./_generated/server";
import type { Identity } from "./devBots";
import type { Author } from "./devSeed";
import { asAccount, botIdentity, BOTS, identityFor } from "./devBots";

// Development only: edited and deleted messages in the seeded group and
// first DM, to see how they look without making them by hand. See dev.ts.

interface Send {
  readonly by: Identity;
  readonly body: string;
  /** The message it replies to: a thread's original, or a reply in it. */
  readonly answers?: string;
  /** A reply shown in the conversation too, quoting what it answers. */
  readonly inChat?: boolean;
}

/** Sends a message, returning its ID. */
async function send(ctx: ActionCtx, conversationId: string, post: Send) {
  const messageId = crypto.randomUUID();
  await asAccount(ctx, post.by, {
    args: {
      attachments: [],
      body: post.body,
      conversationId,
      messageId,
      threadId: post.answers,
      threadOnly: post.answers === undefined ? undefined : !post.inChat,
    },
    type: "send",
  });
  return messageId;
}

async function edit(
  ctx: ActionCtx,
  conversationId: string,
  { by, messageId, body }: { by: Identity; messageId: string; body: string },
) {
  await asAccount(ctx, by, {
    args: { body, conversationId, messageId },
    type: "editMessage",
  });
}

async function remove(
  ctx: ActionCtx,
  conversationId: string,
  { by, messageId }: { by: Identity; messageId: string },
) {
  await asAccount(ctx, by, {
    args: { conversationId, messageId },
    type: "deleteMessage",
  });
}

/**
 * In the group: a message of yours and one of Maya's, edited; a thread
 * whose original Priya deleted (it stays, for its replies), with a reply
 * in the conversation quoting it; and a reply quoting one you deleted.
 */
export async function seedGroupChanges(
  ctx: ActionCtx,
  conversationId: string,
  me: Author,
) {
  const [maya, jonah, priya] = [
    botIdentity(BOTS[0]),
    botIdentity(BOTS[1]),
    botIdentity(BOTS[2]),
  ];
  const self = identityFor(me.address, me.name);
  const tent = await send(ctx, conversationId, {
    body: "Does anyone have a spare tent I could borrow?",
    by: priya,
  });
  await send(ctx, conversationId, {
    answers: tent,
    body: "I have a 2-person one",
    by: jonah,
  });
  await send(ctx, conversationId, {
    answers: tent,
    body: "Mine's free too, it's in the garage",
    by: maya,
    inChat: true,
  });
  await remove(ctx, conversationId, { by: priya, messageId: tent });
  const mine = await send(ctx, conversationId, {
    body: "Leaving at 9 tomorrow",
    by: self,
  });
  await edit(ctx, conversationId, {
    body: "Leaving at 9:30 tomorrow",
    by: self,
    messageId: mine,
  });
  const snacks = await send(ctx, conversationId, {
    body: "I'll grab snaks",
    by: maya,
  });
  await edit(ctx, conversationId, {
    body: "I'll grab snacks",
    by: maya,
    messageId: snacks,
  });
  const gas = await send(ctx, conversationId, {
    body: "Who's covering gas?",
    by: jonah,
  });
  const split = await send(ctx, conversationId, {
    answers: gas,
    body: "Split it four ways?",
    by: self,
    inChat: true,
  });
  await send(ctx, conversationId, {
    answers: split,
    body: "Works for me",
    by: priya,
    inChat: true,
  });
  await remove(ctx, conversationId, { by: self, messageId: split });
}

/**
 * In the first DM (bubbles): a message of yours and one of theirs,
 * edited, and a reply quoting a message you deleted.
 */
export async function seedDirectChanges(
  ctx: ActionCtx,
  conversationId: string,
  me: Author,
  them: Identity,
) {
  const self = identityFor(me.address, me.name);
  const mine = await send(ctx, conversationId, {
    body: "Dinner at 7?",
    by: self,
  });
  await edit(ctx, conversationId, {
    body: "Dinner at 7:30?",
    by: self,
    messageId: mine,
  });
  const theirs = await send(ctx, conversationId, {
    body: "Sounds good, see you thre",
    by: them,
  });
  await edit(ctx, conversationId, {
    body: "Sounds good, see you there",
    by: them,
    messageId: theirs,
  });
  const where = await send(ctx, conversationId, {
    body: "Wait, which place again?",
    by: self,
  });
  await send(ctx, conversationId, {
    answers: where,
    body: "The ramen place on 5th",
    by: them,
    inChat: true,
  });
  await remove(ctx, conversationId, { by: self, messageId: where });
}
