import type { Infer } from "convex/values";
import { v } from "convex/values";

import type { IssueState } from "../bug-reports";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { scheduleReply } from "./assistantHook";
import { botAddress, isBotAddress, queryAsBot, SUPPORT } from "./bots";
import { githubConfig, issueStates } from "./github";
import { followIssue } from "./supportLookup";

// TEMPORARY: a one-time pass over support's inbox from before its model
// answered anyone, for people who wrote in and never heard back. Remove it
// once the pass has run (docs/next-release.md).
//
// Support's model can't see the code, so the team works out first what
// became of everything each person sent (fixed, already tracked, or newly
// filed as a GitHub issue) and hands that over: a note per conversation,
// and the issues to follow for them. Support then answers each person with
// a summary, or stays quiet when they only sent a joke (supportAgent.ts,
// `BACKLOG`). These go to real people: ask Shawn first.

interface Waiting {
  accountId: string;
  conversationId: string;
  lastMessage: string;
  sentAt: string;
  sentAtMs: number;
}

/** Seconds between conversations, so they don't all call the model at once. */
const SPACING = 30_000;

/**
 * Operator command: `npx convex run supportBacklog:pending`. Conversations
 * whose newest message is from the person and that support's model has
 * never answered, oldest first.
 */
export const pending = internalQuery({
  args: {},
  handler: async (ctx): Promise<Waiting[]> => {
    const response = await queryAsBot(ctx, SUPPORT, {
      args: {},
      type: "inbox",
    });
    if (response.type !== "inbox") throw new Error("Unexpected response");
    const waiting: Waiting[] = [];
    for (const conversation of response.value) {
      const last = conversation.lastMessage;
      if (conversation.kind !== "direct" || last === null) continue;
      // Theirs, not support's or another bot's.
      if (isBotAddress(last.authorId)) continue;
      const handled = await ctx.db
        .query("botConversations")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation.conversationId),
        )
        .unique();
      if (handled !== null) continue;
      waiting.push({
        accountId: last.authorId,
        conversationId: conversation.conversationId,
        lastMessage: last.body,
        sentAt: new Date(last.sentAt).toISOString(),
        sentAtMs: last.sentAt,
      });
    }
    return waiting.sort((a, b) => a.sentAtMs - b.sentAtMs);
  },
});

const teamInput = v.object({
  conversationId: v.string(),
  /** What became of each thing they sent, for support to tell them. */
  note: v.optional(v.string()),
  /** Issues to follow for them (new or existing), with an everyday summary. */
  follow: v.optional(
    v.array(v.object({ issueNumber: v.number(), summary: v.string() })),
  ),
});

type TeamInput = Infer<typeof teamInput>;

interface Person {
  accountId: string;
  conversationId: string;
}

/**
 * Everyone to answer: each pending conversation, plus each listed one even
 * if it stopped being pending (they wrote again after the deploy), since
 * its note still matters. Throws on a listed conversation that isn't a DM
 * with support.
 */
function peopleToAnswer(waiting: Waiting[], conversations: TeamInput[]) {
  const support = botAddress(SUPPORT);
  const people: Person[] = waiting.map(({ accountId, conversationId }) => ({
    accountId,
    conversationId,
  }));
  for (const { conversationId } of conversations) {
    if (people.some((person) => person.conversationId === conversationId)) {
      continue;
    }
    const members = conversationId.slice("direct:".length).split(":");
    const accountId = members.find((member) => member !== support);
    if (
      !conversationId.startsWith("direct:") ||
      members.length !== 2 ||
      !members.includes(support) ||
      accountId === undefined
    ) {
      throw new Error(`Not a conversation with support: ${conversationId}`);
    }
    people.push({ accountId, conversationId });
  }
  return people;
}

/**
 * The issues to follow, with their state on GitHub. Throws on an issue
 * that doesn't exist, before anyone hears anything.
 */
async function issuesToFollow(people: Person[], conversations: TeamInput[]) {
  const follows = conversations.flatMap((input) => {
    const person = people.find(
      (candidate) => candidate.conversationId === input.conversationId,
    );
    return person === undefined
      ? []
      : (input.follow ?? []).map((item) => ({ ...item, person }));
  });
  const config = githubConfig();
  if (config === null) {
    if (follows.length > 0) {
      throw new Error("GitHub isn't set up on this deployment");
    }
    return { config, follows, states: new Map<number, IssueState>() };
  }
  const states = await issueStates(
    config,
    follows.map((item) => item.issueNumber),
  );
  const missing = follows.filter((item) => !states.has(item.issueNumber));
  if (missing.length > 0) {
    throw new Error(
      `No such issues: ${missing.map((item) => `#${String(item.issueNumber)}`).join(", ")}`,
    );
  }
  return { config, follows, states };
}

/**
 * Operator command:
 * `npx convex run supportBacklog:answerAll "$(cat input.json)"` with
 * `{"conversations":[{"conversationId":…,"note":…,"follow":[…]}]}`.
 * Follows each listed issue for its person, then has support answer every
 * pending or listed conversation, one every 30 seconds, each with its
 * note. Messages real people: run `pending` first and ask Shawn.
 */
export const answerAll = internalAction({
  args: { conversations: v.optional(v.array(teamInput)) },
  handler: async (
    ctx,
    { conversations = [] },
  ): Promise<{ answering: number; following: number }> => {
    const waiting: Waiting[] = await ctx.runQuery(
      internal.supportBacklog.pending,
      {},
    );
    const people = peopleToAnswer(waiting, conversations);
    const { config, follows, states } = await issuesToFollow(
      people,
      conversations,
    );
    for (const { issueNumber, person, summary } of follows) {
      const state = states.get(issueNumber);
      if (config === null || state === undefined) continue;
      await followIssue(ctx, config, state, {
        ...person,
        issueNumber,
        summary,
      });
    }
    const now = Date.now();
    for (const [index, person] of people.entries()) {
      await ctx.runMutation(internal.supportBacklog.answer, {
        ...person,
        note: conversations.find(
          (input) => input.conversationId === person.conversationId,
        )?.note,
        wakeAt: now + index * SPACING,
      });
    }
    return { answering: people.length, following: follows.length };
  },
});

export const answer = internalMutation({
  args: {
    accountId: v.string(),
    conversationId: v.string(),
    note: v.optional(v.string()),
    wakeAt: v.number(),
  },
  handler: (ctx, args) =>
    scheduleReply(ctx, { ...args, backlog: true, bot: SUPPORT.username }),
});
