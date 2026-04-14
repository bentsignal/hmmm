/* eslint-disable no-restricted-syntax, complexity, max-lines, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions */
// One-shot cutover migration. Lots of `any` because the legacy
// `components.agent.*` API is going away in a follow-up PR and the data
// shapes returned from it are typed as opaque from our side. Disabling
// the strict rules here is OK — this file gets deleted as soon as the
// migration has run in production.

import { Migrations } from "@convex-dev/migrations";
import { v } from "convex/values";

import type { DataModel, Id } from "./_generated/dataModel.js";
import { components, internal } from "./_generated/api.js";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server.js";

export const migrations = new Migrations<DataModel>(components.migrations);
export const run = migrations.runner();

/**
 * One-shot cutover migration: read every thread + message currently living
 * inside the `@convex-dev/agent` Convex component and copy it into the new
 * unified `threads` / `messages` tables that now live directly in this app.
 *
 * Run order:
 *   1. Deploy this PR. The agent component is still mounted, but all host
 *      code has been pointed at the inlined `packages/db/src/agent/` module.
 *      Existing threads/messages live in the component and are unreachable
 *      from the new code path until this migration finishes.
 *   2. Run `npx convex run migrations:runInlineAgentCutover` (or invoke
 *      `migrations:runInlineAgentCutover` from the dashboard). This is an
 *      action that drives the migration by calling small per-thread
 *      mutations, so it does NOT hit Convex's per-mutation 32k document
 *      read limit even on heavy users.
 *   3. Verify a known thread loads correctly via the UI.
 *   4. In a follow-up PR, remove `app.use(agent)` from `convex.config.ts`,
 *      drop `@convex-dev/agent` from `package.json`, and delete this file.
 *
 * Idempotency: the new `threads` table has a `legacyAgentThreadId` field
 * indexed by `by_legacy_agent_thread_id`. Each old thread is keyed by its
 * legacy id when copied; re-running the action skips already-copied threads
 * and resumes any half-copied thread from its existing message count.
 *
 * NOTE: `_creationTime` cannot be set on insert, so legacy thread / message
 * timestamps are preserved via `updatedAt` on threads. UI sorting already
 * uses `updatedAt`, so display order is preserved. Brand-new convex `_id`s
 * are generated; the frontend re-fetches threads from the server, so cached
 * client-side ids will be invalidated naturally.
 *
 * Streams (`streamingMessages`, `streamDeltas`) are *not* migrated. They are
 * transient — anything in flight at cutover will appear as a failed message
 * and the user can retry. This is acceptable.
 */
export const runInlineAgentCutover = internalAction({
  args: {
    /** How many old threads to fetch per page from the agent component. */
    threadPageSize: v.optional(v.number()),
    /** How many messages to copy per child mutation invocation. Bounded by
     *  Convex's 32k-doc-per-mutation limit; 2000 leaves plenty of headroom. */
    messagePageSize: v.optional(v.number()),
    /** How many threads to copy in parallel inside the action. Threads are
     *  independent of each other so this is safe; raising it scales linearly
     *  until you hit the legacy component's read throughput. */
    threadConcurrency: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const threadPageSize = args.threadPageSize ?? 100;
    const messagePageSize = args.messagePageSize ?? 2000;
    const threadConcurrency = args.threadConcurrency ?? 16;

    let totalThreadsConsidered = 0;
    let totalThreadsCopied = 0;
    let totalThreadsAlreadyDone = 0;
    let totalMessagesCopied = 0;

    // Walk every user. We use the local users table because it's the
    // authoritative list of identities for this app.
    let userCursor: string | null = null;
    while (true) {
      const userPage = (await ctx.runQuery(internal.migrations.listUsersPage, {
        cursor: userCursor,
        numItems: 200,
      })) as {
        page: { userId: string }[];
        continueCursor: string;
        isDone: boolean;
      };
      for (const user of userPage.page) {
        // Walk every legacy thread for this user.
        let threadCursor: string | null = null;
        while (true) {
          const threadsPage = (await ctx.runQuery(
            components.agent.threads.listThreadsByUserId,
            {
              userId: user.userId,
              order: "asc",
              paginationOpts: {
                cursor: threadCursor,
                numItems: threadPageSize,
              },
            },
          )) as {
            page: any[];
            continueCursor: string;
            isDone: boolean;
          };
          // Copy threads in this page in parallel. Each thread's copy is
          // independent (its own ensureNewThread + copyMessagesIntoNewThread
          // mutations), so racing them through the network drops the wall
          // time roughly linearly with concurrency.
          for (let i = 0; i < threadsPage.page.length; i += threadConcurrency) {
            const slice = threadsPage.page.slice(i, i + threadConcurrency);
            const results = await Promise.all(
              slice.map((oldThread) =>
                copyOneThread(ctx, user.userId, oldThread, messagePageSize),
              ),
            );
            for (const result of results) {
              totalThreadsConsidered++;
              totalMessagesCopied += result.messagesCopied;
              if (result.alreadyDone) {
                totalThreadsAlreadyDone++;
              } else {
                totalThreadsCopied++;
              }
            }
          }
          if (threadsPage.isDone) break;
          threadCursor = threadsPage.continueCursor;
        }
      }
      if (userPage.isDone) break;
      userCursor = userPage.continueCursor;
    }

    return {
      totalThreadsConsidered,
      totalThreadsCopied,
      totalThreadsAlreadyDone,
      totalMessagesCopied,
    };
  },
});

async function copyOneThread(
  ctx: { runMutation: any; runQuery: any },
  userId: string,
  oldThread: any,
  messagePageSize: number,
) {
  // Step 1: ensure a new thread row exists, get back its _id and the
  // (order, stepOrder) of the highest message we've already copied so we
  // can resume.
  const ensured = (await ctx.runMutation(internal.migrations.ensureNewThread, {
    userId,
    legacyAgentThreadId: oldThread._id,
    title: oldThread.title ?? "Untitled",
    summary: oldThread.summary,
    status: oldThread.status,
    legacyCreationTime: oldThread._creationTime,
  })) as {
    newThreadId: Id<"threads">;
    alreadyDone: boolean;
    lastCopiedOrder: number | null;
    lastCopiedStepOrder: number | null;
  };

  if (ensured.alreadyDone) {
    return { messagesCopied: 0, alreadyDone: true };
  }

  // Step 2: page through messages on the legacy thread and copy them in
  // small batches. Each `copyMessagesIntoNewThread` call is its own
  // mutation transaction, so the per-mutation 32k document limit only
  // applies to a single page (~200 messages by default, ~400 doc reads).
  let cursor: string | null = null;
  let copied = 0;
  while (true) {
    const page = (await ctx.runQuery(
      components.agent.messages.listMessagesByThreadId,
      {
        threadId: oldThread._id as Id<"threads">,
        order: "asc",
        paginationOpts: { cursor, numItems: messagePageSize },
      },
    )) as { page: any[]; continueCursor: string; isDone: boolean };

    const toCopy = page.page.filter((msg) => {
      // Skip anything we already copied on a previous resume.
      if (ensured.lastCopiedOrder === null) return true;
      if (msg.order > ensured.lastCopiedOrder) return true;
      if (msg.order === ensured.lastCopiedOrder) {
        return msg.stepOrder > (ensured.lastCopiedStepOrder ?? -1);
      }
      return false;
    });

    if (toCopy.length > 0) {
      await ctx.runMutation(internal.migrations.copyMessagesIntoNewThread, {
        newThreadId: ensured.newThreadId,
        messages: toCopy.map((m) => ({
          userId: m.userId,
          order: m.order,
          stepOrder: m.stepOrder,
          status: m.status,
          agentName: m.agentName,
          model: m.model,
          provider: m.provider,
          providerOptions: m.providerOptions,
          message: m.message,
          tool: m.tool,
          text: m.text,
          usage: m.usage,
          providerMetadata: m.providerMetadata,
          sources: m.sources,
          warnings: m.warnings,
          finishReason: m.finishReason,
          reasoning: m.reasoning,
          reasoningDetails: m.reasoningDetails,
          error: m.error,
        })),
      });
      copied += toCopy.length;
    }

    if (page.isDone) break;
    cursor = page.continueCursor;
  }

  // Step 3: mark the new thread as fully migrated so a re-run skips it.
  await ctx.runMutation(internal.migrations.markThreadMigrated, {
    newThreadId: ensured.newThreadId,
  });

  return { messagesCopied: copied, alreadyDone: false };
}

// ---------------------------------------------------------------------------
// Helper queries / mutations called by the action above. Each one is
// intentionally small so it stays well under Convex's per-mutation document
// read limit (32k docs).
// ---------------------------------------------------------------------------

export const listUsersPage = internalQuery({
  args: { cursor: v.union(v.string(), v.null()), numItems: v.number() },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("users")
      .paginate({ cursor: args.cursor, numItems: args.numItems });
    return {
      page: result.page.map((u) => ({ userId: u.userId })),
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

const ensureNewThreadArgs = {
  userId: v.string(),
  legacyAgentThreadId: v.string(),
  title: v.string(),
  summary: v.optional(v.string()),
  status: v.union(v.literal("active"), v.literal("archived")),
  legacyCreationTime: v.number(),
};

export const ensureNewThread = internalMutation({
  args: ensureNewThreadArgs,
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("threads")
      .withIndex("by_legacy_agent_thread_id", (q) =>
        q.eq("legacyAgentThreadId", args.legacyAgentThreadId),
      )
      .first();
    if (existing) {
      // If we previously inserted but the marker was set, this thread was
      // fully copied. We use `state === "idle"` as the signal because
      // markThreadMigrated patches state from "waiting" to "idle". Any
      // resumed thread keeps `state: "waiting"` until copy completes.
      const alreadyDone = existing.state === "idle";
      // Find the highest (order, stepOrder) we've copied so far on this
      // thread so we can resume.
      let lastCopiedOrder: number | null = null;
      let lastCopiedStepOrder: number | null = null;
      if (!alreadyDone) {
        const last = await ctx.db
          .query("messages")
          .withIndex("threadId_status_tool_order_stepOrder", (q) =>
            q.eq("threadId", existing._id),
          )
          .order("desc")
          .first();
        if (last) {
          lastCopiedOrder = last.order;
          lastCopiedStepOrder = last.stepOrder;
        }
      }
      return {
        newThreadId: existing._id,
        alreadyDone,
        lastCopiedOrder,
        lastCopiedStepOrder,
      };
    }

    const newThreadId: Id<"threads"> = await ctx.db.insert("threads", {
      userId: args.userId,
      title: args.title,
      summary: args.summary,
      status: args.status,
      // "waiting" sentinel: not idle until markThreadMigrated finishes.
      state: "waiting",
      pinned: false,
      updatedAt: args.legacyCreationTime,
      legacyAgentThreadId: args.legacyAgentThreadId,
    });
    return {
      newThreadId,
      alreadyDone: false,
      lastCopiedOrder: null,
      lastCopiedStepOrder: null,
    };
  },
});

export const copyMessagesIntoNewThread = internalMutation({
  args: {
    newThreadId: v.id("threads"),
    messages: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    for (const m of args.messages) {
      await ctx.db.insert("messages", {
        threadId: args.newThreadId,
        userId: m.userId,
        order: m.order,
        stepOrder: m.stepOrder,
        status: m.status,
        agentName: m.agentName,
        model: m.model,
        provider: m.provider,
        providerOptions: m.providerOptions,
        message: m.message,
        tool: m.tool,
        text: m.text,
        usage: m.usage,
        providerMetadata: m.providerMetadata,
        sources: m.sources,
        warnings: m.warnings,
        finishReason: m.finishReason,
        reasoning: m.reasoning,
        reasoningDetails: m.reasoningDetails,
        error: m.error,
      });
    }
  },
});

export const markThreadMigrated = internalMutation({
  args: { newThreadId: v.id("threads") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.newThreadId, { state: "idle" });
  },
});

// ---------------------------------------------------------------------------
// Dev-only reset helper. Wipes only threads that were created by the cutover
// migration (i.e. those carrying a `legacyAgentThreadId`), plus all of their
// messages. Threads created via the new code path in the UI are preserved.
// Use this to time the migration from a clean slate while iterating.
//
// Run via: `npx convex run migrations:resetMigratedThreads` (or from the
// dashboard).
// ---------------------------------------------------------------------------

export const resetMigratedThreads = internalAction({
  args: {
    /** Concurrency for the parallel thread deletion. */
    concurrency: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const concurrency = args.concurrency ?? 16;
    let deletedThreads = 0;
    let deletedMessages = 0;

    while (true) {
      const page = (await ctx.runQuery(
        internal.migrations.listMigratedThreadsPage,
        { numItems: 100 },
      )) as { threadIds: Id<"threads">[] };
      if (page.threadIds.length === 0) break;

      for (let i = 0; i < page.threadIds.length; i += concurrency) {
        const slice = page.threadIds.slice(i, i + concurrency);
        const results = await Promise.all(
          slice.map((threadId) => deleteOneThreadFully(ctx, threadId)),
        );
        for (const result of results) {
          deletedThreads++;
          deletedMessages += result.messagesDeleted;
        }
      }
    }

    return { deletedThreads, deletedMessages };
  },
});

async function deleteOneThreadFully(
  ctx: { runMutation: any },
  threadId: Id<"threads">,
) {
  let messagesDeleted = 0;
  while (true) {
    const result = (await ctx.runMutation(
      internal.migrations.deleteThreadMessagesPage,
      { threadId, numItems: 2000 },
    )) as { deleted: number; isDone: boolean };
    messagesDeleted += result.deleted;
    if (result.isDone) break;
  }
  await ctx.runMutation(internal.migrations.deleteThreadRow, { threadId });
  return { messagesDeleted };
}

export const listMigratedThreadsPage = internalQuery({
  args: { numItems: v.number() },
  handler: async (ctx, args) => {
    // Any thread carrying a `legacyAgentThreadId` was created by the
    // migration. Stream through them in batches.
    const rows = await ctx.db
      .query("threads")
      .withIndex("by_legacy_agent_thread_id", (q) =>
        q.gt("legacyAgentThreadId", ""),
      )
      .take(args.numItems);
    return { threadIds: rows.map((r) => r._id) };
  },
});

export const deleteThreadMessagesPage = internalMutation({
  args: { threadId: v.id("threads"), numItems: v.number() },
  handler: async (ctx, args) => {
    const msgs = await ctx.db
      .query("messages")
      .withIndex("threadId_status_tool_order_stepOrder", (q) =>
        q.eq("threadId", args.threadId),
      )
      .take(args.numItems);
    for (const m of msgs) {
      await ctx.db.delete(m._id);
    }
    return { deleted: msgs.length, isDone: msgs.length < args.numItems };
  },
});

export const deleteThreadRow = internalMutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.threadId);
  },
});
