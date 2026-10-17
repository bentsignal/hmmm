import type { ActionCtx } from "./_generated/server";
import type { Identity } from "./devBots";
import { asAccount, botIdentity, BOTS, stringField } from "./devBots";

// Development only: conversations set up for a release test, so each step
// of the test list has something waiting to try it on. See dev.ts.

/** A long tweet (about 280 characters, with line breaks) for its link card. */
const LONG_TWEET = "https://x.com/complex/status/2111389252701544929";

/** Reactions to the account's messages, so Activity is long enough to scroll. */
const ACTIVITY_ROWS = 30;

function photos(seed: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    height: 600,
    kind: "image" as const,
    mimeType: "image/jpeg",
    name: `photo-${index + 1}.jpg`,
    size: 120_000,
    url: `https://picsum.photos/seed/vera-${seed}-${index}/800/600`,
    width: 800,
  }));
}

async function send(
  ctx: ActionCtx,
  by: Identity,
  conversationId: string,
  {
    attachments = [],
    body,
    mentions,
    threadId,
  }: {
    attachments?: ReturnType<typeof photos>;
    body: string;
    mentions?: Identity;
    threadId?: string;
  },
) {
  const messageId = crypto.randomUUID();
  await asAccount(ctx, by, {
    args: {
      attachments,
      body,
      conversationId,
      mentions:
        mentions === undefined
          ? undefined
          : [{ accountId: mentions.accountId, name: mentions.name }],
      messageId,
      threadId,
      threadOnly: threadId === undefined ? undefined : true,
    },
    type: "send",
  });
  return messageId;
}

async function react(
  ctx: ActionCtx,
  by: Identity,
  conversationId: string,
  messageId: string,
  emoji: string,
  attachment?: number,
) {
  await asAccount(ctx, by, {
    args: { attachment, conversationId, emoji, messageId, on: true },
    type: "react",
  });
}

/**
 * A "Release test" group with Maya, Jonah, and Priya: a bot's message with
 * three photos, a message with a thread reply, the account's own photos
 * with reactions on separate parts (Activity rows), a long tweet, and an
 * @mention. Sending in it has the bots answer, as in any bot conversation.
 */
async function seedGroup(ctx: ActionCtx, me: Identity) {
  const [maya, jonah, priya] = [
    botIdentity(BOTS[0]),
    botIdentity(BOTS[1]),
    botIdentity(BOTS[2]),
  ];
  const conversationId = stringField(
    await asAccount(ctx, jonah, {
      args: {
        members: [me.accountId, maya.accountId, priya.accountId],
        name: "Release test",
      },
      type: "createGroup",
    }),
    "conversationId",
  );
  const theirs = await send(ctx, maya, conversationId, {
    attachments: photos("theirs", 3),
    body: "Three from Saturday",
  });
  await react(ctx, priya, conversationId, theirs, "🔥", 0);
  const question = await send(ctx, priya, conversationId, {
    body: "Who's in for Sunday?",
  });
  await send(ctx, jonah, conversationId, {
    body: "Me, if it's after noon",
    threadId: question,
  });
  const mine = await send(ctx, me, conversationId, {
    attachments: photos("mine", 3),
    body: "Mine from Saturday",
  });
  await react(ctx, maya, conversationId, mine, "👍");
  await react(ctx, priya, conversationId, mine, "❤️", 1);
  await react(ctx, jonah, conversationId, mine, "😂", 2);
  await send(ctx, jonah, conversationId, {
    body: `this is wild ${LONG_TWEET}`,
  });
  await send(ctx, maya, conversationId, {
    body: `@${me.name} the second one of yours is my favorite`,
    mentions: me,
  });
  return conversationId;
}

/**
 * A DM with Leo where he reacts to each of the account's messages, so
 * Activity has a screenful and more of rows to scroll.
 */
async function seedActivity(ctx: ActionCtx, me: Identity) {
  const leo = botIdentity(BOTS[3]);
  const conversationId = stringField(
    await asAccount(ctx, leo, {
      args: { accountId: me.accountId },
      type: "openDirect",
    }),
    "conversationId",
  );
  const emoji = ["❤️", "👍", "😂", "🔥", "😮"];
  for (let index = 0; index < ACTIVITY_ROWS; index += 1) {
    const messageId = await send(ctx, me, conversationId, {
      body: `Scroll test ${index + 1}`,
    });
    await react(
      ctx,
      leo,
      conversationId,
      messageId,
      emoji[index % emoji.length] ?? "❤️",
    );
  }
  return conversationId;
}

export async function seedReleaseTest(ctx: ActionCtx, me: Identity) {
  return {
    activity: await seedActivity(ctx, me),
    group: await seedGroup(ctx, me),
  };
}
