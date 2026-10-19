import type { Message } from "@decentralized-convex/messages";
import type { StepResult, ToolSet } from "ai";
import { convexGateway } from "@convex-dev/ai-sdk-provider";
import { generateText, isStepCount } from "ai";
import { v } from "convex/values";

import type { ActionCtx } from "./_generated/server";
import type { Turn } from "./agentTools";
import type { BotAccount } from "./bots";
import type { Tally } from "./usage";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import { inAnswerOrder, toModelMessages } from "./agentHistory";
import { currentTools, keepTyping, MODEL } from "./agentTools";
import { botAccount, botAddress, sendAsBot } from "./bots";
import { recallOlder } from "./memory";
import { takeReply } from "./rateLimits";
import { supportAssistant } from "./supportAgent";
import { usageOf } from "./usage";
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
/** How long one model call may take before it's tried again (it's usually 2-5 s). */
const STEP_TIMEOUT = 40_000;
/** Model calls in one reply (each may call several tools). */
const MAX_STEPS = 8;
/** A reply that has run this long is assumed to have died. */
const STALE_RUN = 10 * 60 * 1000;

/** How hard Grok thinks before each step: lower is faster and cheaper. */
const REASONING = { convexGateway: { reasoningEffort: "low" } };

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
 * is over the hourly limit (rateLimits.ts).
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
    const limit = await takeReply(ctx, row.accountId);
    if (!limit.ok) {
      if (limit.notice !== null) {
        await sendAsBot(ctx, botAccount(row.bot), conversationId, limit.notice);
      }
      return null;
    }
    await ctx.db.patch(row._id, { rerun: false, runningSince: now });
    return {
      accountId: row.accountId,
      answeredThrough: row.answeredThrough ?? null,
      backlog: row.backlog === true,
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
    // Vera remembers the whole conversation (memory.ts).
    if (row.bot === "vera") {
      await ctx.scheduler.runAfter(0, internal.memoryBuild.update, {
        bot: row.bot,
        conversationId,
      });
    }
    if (row.rerun !== true) {
      await ctx.db.patch(row._id, {
        ...answered,
        backlog: undefined,
        runningSince: undefined,
      });
      return;
    }
    const wakeAt = Date.now();
    await ctx.db.patch(row._id, {
      ...answered,
      backlog: undefined,
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
 * Sends the model's messages in the order it sent them, with a beat
 * between them as if typing the next one.
 */
function messageSender(
  ctx: ActionCtx,
  bot: BotAccount,
  conversationId: string,
  typing: ReturnType<typeof keepTyping>,
) {
  let sent = 0;
  let queue = Promise.resolve();
  return {
    send: (text: string) => {
      const body = text.trim().slice(0, 4000);
      if (body.length === 0) return queue;
      queue = queue.then(async () => {
        // Spaced like someone typing the next one, so they don't land at once.
        if (sent > 0) {
          await typing.pause(Math.min(4000, 1200 + body.length * 20));
        }
        await ctx.runMutation(internal.bots.post, {
          body,
          bot: bot.username,
          conversationId,
        });
        typing.sent();
        sent += 1;
      });
      return queue;
    },
    sent: () => sent,
  };
}

/**
 * The recent conversation to answer, or null when the person hasn't
 * written since the last reply saw their messages.
 */
function toAnswer(
  messages: readonly Message[],
  self: string,
  answeredThrough: number | null,
) {
  const recent = messages
    .filter((message) => message.deletedAt === undefined)
    .slice(-HISTORY);
  const history =
    answeredThrough === null
      ? recent
      : inAnswerOrder(recent, self, answeredThrough);
  const newest = history.findLast((message) => message.authorId !== self);
  if (newest === undefined || newest.sentAt <= (answeredThrough ?? 0)) {
    return null;
  }
  return history;
}

/**
 * Ends the reply after a step that only sent messages (or shared support's
 * privacy notice): the model has said its piece and waits for them. It goes
 * on only after other tools, such as a search, whose results it needs.
 * Without this, models keep talking after their answer, even to themselves.
 */
function saidItsPiece({ steps }: { steps: StepResult<ToolSet>[] }) {
  const calls = steps.at(-1)?.toolCalls ?? [];
  return (
    calls.some((call) => call.toolName === "share_privacy_notice") ||
    (calls.length > 0 &&
      calls.every((call) => call.toolName === "send_message"))
  );
}

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
    backlog,
  }: { accountId: string; answeredThrough: number | null; backlog: boolean },
) {
  const page = await ctx.runQuery(internal.bots.page, {
    bot: bot.username,
    conversationId,
  });
  const self = botAddress(bot);
  const history = toAnswer(page.messages, self, answeredThrough);
  const newest = history?.findLast((message) => message.authorId !== self);
  if (history === null || newest === undefined) return;
  await ctx.runMutation(internal.bots.markRead, {
    bot: bot.username,
    conversationId,
  });
  const typing = keepTyping(ctx, bot, conversationId);
  try {
    const messages = toModelMessages(history, self);
    const sender = messageSender(ctx, bot, conversationId, typing);
    const tally: Tally = { memoryLookups: 0, searches: 0 };
    const started = Date.now();
    const turn: Turn = {
      ...sender,
      counted: (what) => {
        if (what === "search") tally.searches += 1;
        else tally.memoryLookups += 1;
      },
      accountId,
      backlog,
      bot,
      conversationId,
      ctx,
      lastHeardAt: newest.sentAt,
      name: newest.authorName,
      oldestSentAt: page.hasOlder ? (history[0]?.sentAt ?? null) : null,
      recalled: await recallOlder(ctx, bot, conversationId, {
        answeredThrough,
        hasOlder: page.hasOlder,
        history,
        tally,
      }),
      timeZone: await ctx.runQuery(internal.timeZones.of, { accountId }),
    };
    const assistant = ASSISTANTS[bot.username];
    const tools = assistant.tools(turn);
    const options = {
      allowSystemInMessages: true,
      instructions: await assistant.instructions(turn),
      // Last before it answers, where it outweighs what the chat says.
      messages: [
        ...messages,
        { content: currentTools(tools), role: "system" as const },
      ],
      model: convexGateway(MODEL, { zdr: true }),
      providerOptions: REASONING,
      stopWhen: [isStepCount(MAX_STEPS), saidItsPiece],
      timeout: { stepMs: STEP_TIMEOUT },
      toolCallConcurrency: 1,
      tools,
    };
    const result = await generateText(options).catch((error: unknown) => {
      // A model call that stalled: try once more if nothing went out yet.
      if (sender.sent() > 0) throw error;
      console.warn(`${bot.username} retrying a failed reply`, error);
      return generateText(options);
    });
    // A model that ended in plain text instead of calling send_message,
    // such as an answer after a search's heads-up.
    const lastSent = result.steps
      .at(-1)
      ?.toolCalls.some((call) => call.toolName === "send_message");
    if (lastSent !== true && result.text.trim().length > 0) {
      await turn.send(result.text);
    }
    await ctx.runMutation(internal.usage.record, {
      ...usageOf(result, tally),
      accountId,
      bot: bot.username,
      ms: Date.now() - started,
    });
  } finally {
    await typing.stop();
  }
  return newest.sentAt;
}
