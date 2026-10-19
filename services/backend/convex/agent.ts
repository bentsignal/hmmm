import type { ToolSet } from "ai";
import { convexGateway } from "@convex-dev/ai-sdk-provider";
import { generateText, isStepCount } from "ai";
import { v } from "convex/values";

import type { ActionCtx } from "./_generated/server";
import type { Turn } from "./agentTools";
import type { BotAccount } from "./bots";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import {
  describeImages,
  imagesIn,
  inAnswerOrder,
  toModelMessages,
} from "./agentHistory";
import { keepTyping, MODEL } from "./agentTools";
import { botAccount, botAddress, sendAsBot } from "./bots";
import { supportAssistant } from "./supportAgent";
import { veraAssistant } from "./vera";

// The harness every assistant runs on. A direct message to one schedules
// `run` (bots.ts `afterPdsMutation`); it reads the conversation, hands it to
// the model with the assistant's instructions and tools, and the model
// answers by calling `send_message`. One reply runs per conversation at a
// time; messages that arrive meanwhile get the next one.

export interface Assistant {
  readonly instructions: (turn: Turn) => Promise<string>;
  readonly tools: (turn: Turn) => ToolSet;
}

const ASSISTANTS: Record<BotAccount["username"], Assistant> = {
  support: supportAssistant,
  vera: veraAssistant,
};

/** Recent messages the model sees; older ones it can read with a tool. */
const HISTORY = 40;
/** Model calls in one reply (each may call several tools). */
const MAX_STEPS = 8;
/** Replies one person gets from one assistant a day. */
const DAILY_LIMIT = 150;
const DAY = 24 * 60 * 60 * 1000;
/** A reply that has run this long is assumed to have died. */
const STALE_RUN = 10 * 60 * 1000;

const LIMIT_NOTICE =
  "I've hit my limit for our chat today. Try me again tomorrow.";
const FAILURE_NOTICE =
  "Sorry, something went wrong on my end. Try again in a moment.";

export const run = internalAction({
  args: { conversationId: v.string(), wakeAt: v.number() },
  handler: async (ctx, { conversationId, wakeAt }) => {
    const claim = await ctx.runMutation(internal.agent.claim, {
      conversationId,
      wakeAt,
    });
    if (claim === null) return;
    const bot = botAccount(claim.bot);
    let answeredThrough: number | undefined;
    try {
      answeredThrough = await reply(ctx, bot, conversationId, claim);
    } catch (error) {
      console.error(`${bot.username} failed to reply`, error);
      await ctx.runMutation(internal.bots.post, {
        body: FAILURE_NOTICE,
        bot: bot.username,
        conversationId,
      });
    } finally {
      await ctx.runMutation(internal.agent.finish, {
        answeredThrough,
        conversationId,
      });
    }
  },
});

/**
 * Starts the reply this wake-up is for, or returns null: a newer message
 * moved it later, one is already running (it answers next), or the person
 * has used up today's replies.
 */
export const claim = internalMutation({
  args: { conversationId: v.string(), wakeAt: v.number() },
  handler: async (ctx, { conversationId, wakeAt }) => {
    const row = await ctx.db
      .query("botConversations")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .unique();
    if (row?.wakeAt !== wakeAt) return null;
    const now = Date.now();
    if (row.runningSince !== undefined && now - row.runningSince < STALE_RUN) {
      await ctx.db.patch(row._id, { rerun: true });
      return null;
    }
    const newDay = now - row.dayStart >= DAY;
    const runsToday = newDay ? 0 : row.runsToday;
    const day = newDay
      ? { dayStart: now, limitNoticeSent: false, runsToday }
      : {};
    if (runsToday >= DAILY_LIMIT) {
      if (row.limitNoticeSent !== true) {
        await sendAsBot(ctx, botAccount(row.bot), conversationId, LIMIT_NOTICE);
      }
      await ctx.db.patch(row._id, { ...day, limitNoticeSent: true });
      return null;
    }
    await ctx.db.patch(row._id, {
      ...day,
      rerun: false,
      runningSince: now,
      runsToday: runsToday + 1,
    });
    return {
      accountId: row.accountId,
      answeredThrough: row.answeredThrough ?? 0,
      bot: row.bot,
    };
  },
});

/** Ends a reply, and starts the next if messages came in meanwhile. */
export const finish = internalMutation({
  args: {
    answeredThrough: v.optional(v.number()),
    conversationId: v.string(),
  },
  handler: async (ctx, { answeredThrough, conversationId }) => {
    const row = await ctx.db
      .query("botConversations")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .unique();
    if (row === null) return;
    const answered = {
      answeredThrough: Math.max(row.answeredThrough ?? 0, answeredThrough ?? 0),
    };
    if (row.rerun !== true) {
      await ctx.db.patch(row._id, { ...answered, runningSince: undefined });
      return;
    }
    const wakeAt = Date.now();
    await ctx.db.patch(row._id, {
      ...answered,
      rerun: false,
      runningSince: undefined,
      wakeAt,
    });
    await ctx.scheduler.runAfter(0, internal.agent.run, {
      conversationId,
      wakeAt,
    });
  },
});

/**
 * Answers the person's messages that no reply has seen yet, and returns
 * when the newest of them was sent (undefined when there were none).
 */
async function reply(
  ctx: ActionCtx,
  bot: BotAccount,
  conversationId: string,
  {
    accountId,
    answeredThrough,
  }: { accountId: string; answeredThrough: number },
) {
  const page = await ctx.runQuery(internal.bots.page, {
    bot: bot.username,
    conversationId,
  });
  const self = botAddress(bot);
  const history = inAnswerOrder(
    page.messages
      .filter((message) => message.deletedAt === undefined)
      .slice(-HISTORY),
    self,
    answeredThrough,
  );
  const newest = history.findLast((message) => message.authorId !== self);
  if (newest === undefined || newest.sentAt <= answeredThrough) return;
  await ctx.runMutation(internal.bots.markRead, {
    bot: bot.username,
    conversationId,
  });
  const typing = keepTyping(ctx, bot, conversationId);
  try {
    const images = imagesIn(history, self);
    const descriptions = await describeImages(ctx, [...images.values()]);
    const messages = toModelMessages(history, self, descriptions);
    let sent = 0;
    // Messages go out in the order the model sent them.
    let queue = Promise.resolve();
    const turn: Turn = {
      accountId,
      bot,
      conversationId,
      ctx,
      images,
      name:
        history.findLast((message) => message.authorId === accountId)
          ?.authorName ?? accountId,
      oldestSentAt: page.hasOlder ? (history[0]?.sentAt ?? null) : null,
      send: (text) => {
        const body = text.trim().slice(0, 4000);
        if (body.length === 0) return queue;
        queue = queue.then(async () => {
          // A beat between messages, as if typing the next one.
          if (sent > 0) {
            await typing.pause(Math.min(1800, 500 + body.length * 12));
          }
          await ctx.runMutation(internal.bots.post, {
            body,
            bot: bot.username,
            conversationId,
          });
          sent += 1;
        });
        return queue;
      },
      sent: () => sent,
    };
    const assistant = ASSISTANTS[bot.username];
    const result = await generateText({
      instructions: await assistant.instructions(turn),
      messages,
      model: convexGateway(MODEL, { zdr: true }),
      stopWhen: isStepCount(MAX_STEPS),
      toolCallConcurrency: 1,
      tools: assistant.tools(turn),
    });
    // A model that answered in plain text instead of calling send_message.
    if (sent === 0 && result.text.trim().length > 0) {
      await turn.send(result.text);
    }
  } finally {
    await typing.stop();
  }
  return newest.sentAt;
}
