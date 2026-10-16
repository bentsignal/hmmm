import type { ActionCtx } from "./_generated/server";
import type { Identity } from "./devBots";
import type { Author } from "./devSeed";
import { asAccount, botIdentity, BOTS, identityFor } from "./devBots";

// Development only: threads for the seeded group and space. See dev.ts.

/**
 * A message with a thread: the first post, then its replies. The first
 * reply shows in the conversation, the rest only in the thread.
 */
async function seedThread(
  ctx: ActionCtx,
  conversationId: string,
  posts: readonly { body: string; by: Identity; mentions?: Author }[],
) {
  const threadId = crypto.randomUUID();
  for (const [index, { body, by, mentions }] of posts.entries()) {
    const isRoot = index === 0;
    await asAccount(ctx, by, {
      args: {
        attachments: [],
        body,
        conversationId,
        mentions:
          mentions === undefined
            ? undefined
            : [{ accountId: mentions.address, name: mentions.name }],
        messageId: isRoot ? threadId : crypto.randomUUID(),
        threadId: isRoot ? undefined : threadId,
      },
      type: "send",
    });
  }
}

/**
 * The group's threads: one the account isn't in (whose last reply
 * @mentions it), one it started, and one it replied to. The last reply in
 * each of its own is unread.
 */
export async function seedGroupThreads(
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
  await seedThread(ctx, conversationId, [
    { body: "Who's in for the lake on Saturday?", by: maya },
    { body: "I'm in! Can bring the cooler", by: jonah },
    { body: "Only if we leave after 10", by: priya },
    { body: "10 works. I'll drive", by: maya },
    { body: `@${me.name} you coming?`, by: jonah, mentions: me },
  ]);
  await seedThread(ctx, conversationId, [
    { body: "Anyone know a good brunch spot near the lake?", by: self },
    { body: "The Dockside does great pancakes", by: jonah },
    { body: "+1 for the Dockside, get there before 10", by: priya },
  ]);
  await seedThread(ctx, conversationId, [
    { body: "Made a playlist for the drive 🎶", by: jonah },
    { body: "Add some Fleetwood Mac", by: self },
    { body: "Already on it", by: maya },
  ]);
}

/** A thread in the space's #general that the account replied to. */
export async function seedChannelThread(
  ctx: ActionCtx,
  conversationId: string,
  me: Author,
) {
  const [maya, priya, leo] = [
    botIdentity(BOTS[0]),
    botIdentity(BOTS[2]),
    botIdentity(BOTS[3]),
  ];
  await seedThread(ctx, conversationId, [
    { body: "Release notes draft is up, comments welcome", by: leo },
    { body: "Looks good! Typo in the second paragraph", by: maya },
    {
      body: "Should we mention the new filter?",
      by: identityFor(me.address, me.name),
    },
    { body: "Yes, add a line about threads", by: priya },
  ]);
}
