import type { TypingSize } from "@decentralized-convex/messages";
import { typingSize, typingSizeOf } from "@decentralized-convex/messages";
import { v } from "convex/values";

import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { REPLIES, requireDevTools } from "./devBots";

// Development only: bots typing, with how long their message is growing
// as they go, for trying the typing indicator's sizes.

/** Replies long enough that typing them shows a paragraph or an essay. */
const LONG_REPLIES = [
  "Okay so I finally looked at the plan for Saturday. If we leave at nine we beat the traffic, grab breakfast on the way, and still get to the trailhead before it fills up. The loop is about eight miles with one steep part near the end, so bring real shoes. I can drive if someone else handles snacks.",
  "Honestly I've been thinking about this all week and I don't think we should rush it. Every time we've tried to do everything at once it falls apart halfway through, and then we spend twice as long cleaning it up. What if we pick the one part that matters most, do that properly, and see how it feels before we commit to the rest? I know it's slower on paper, but it's faster than redoing it. Also, and I mean this kindly, the last time we said we'd figure out the details later, later turned out to be three weekends in a row. Let's write down who's doing what before we start, put dates next to it, and check in on Wednesday. If it's going well we keep going, and if it isn't we stop and talk before anyone sinks another weekend into it.",
];

/** What bots answer with: mostly short, sometimes long. */
export const BOT_REPLIES = [...REPLIES, ...LONG_REPLIES];

const TYPING_SIZES = typingSize.members.map(
  (member) => member.value,
) satisfies TypingSize[];

/**
 * Has a bot type `body` from `typesAt` until it sends it at `saysAt`: its
 * size grows step by step, as a person's would, up to `body`'s.
 */
export async function typeOut(
  ctx: ActionCtx,
  {
    body,
    conversationId,
    saysAt,
    threadId,
    typesAt,
    username,
  }: {
    body: string;
    conversationId: string;
    saysAt: number;
    threadId: string | undefined;
    typesAt: number;
    username: string;
  },
) {
  const sizes = TYPING_SIZES.slice(
    0,
    TYPING_SIZES.indexOf(typingSizeOf(body)) + 1,
  );
  for (const [step, size] of sizes.entries()) {
    await ctx.scheduler.runAfter(
      typesAt + (step * (saysAt - typesAt)) / sizes.length,
      internal.dev.type,
      { conversationId, size, threadId, typing: true, username },
    );
  }
}

/**
 * A bot types a long message slowly enough to read each size the typing
 * indicator shows (typing, a paragraph, an essay), then
 * sends it: `npx convex run devTyping:typingSizes '{"conversationId":"...","username":"maya"}'`.
 */
export const typingSizes = internalAction({
  args: {
    conversationId: v.string(),
    threadId: v.optional(v.string()),
    username: v.string(),
  },
  handler: async (ctx, { conversationId, threadId, username }) => {
    requireDevTools();
    const body = LONG_REPLIES.at(-1) ?? "";
    // Each size for four seconds, which also keeps the typing up.
    const saysAt = TYPING_SIZES.length * 4000;
    await typeOut(ctx, {
      body,
      conversationId,
      saysAt,
      threadId,
      typesAt: 0,
      username,
    });
    await ctx.scheduler.runAfter(saysAt, internal.dev.say, {
      body,
      conversationId,
      threadId,
      username,
    });
  },
});
