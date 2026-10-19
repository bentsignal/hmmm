import type { Infer } from "convex/values";
import { v } from "convex/values";

import type { Delivery, IssueState, ReportStage } from "../bug-reports";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import type { GitHubConfig } from "./github";
import {
  isFinalStage,
  isNewStage,
  progressOf,
  updateMessage,
} from "../bug-reports";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { sendAsBot, SUPPORT } from "./bots";
import {
  githubConfig,
  issueStates,
  latestReleases,
  tagIncludes,
} from "./github";
import { reportStage } from "./schema";

// The bug reports Vera Support files (supportAgent.ts) and how they're
// going. A cron (crons.ts) reads each open report's GitHub issue and tells
// the reporter, in plain words, when someone picks it up, when a fix is
// being worked on, when it's fixed, and when the fix is out. "Out" means
// the fix's commit is in the newest production release tags (see
// docs/releasing.md): an update or store build for app changes, a backend
// deploy for backend changes.

export const insert = internalMutation({
  args: {
    accountId: v.string(),
    conversationId: v.string(),
    issueNumber: v.optional(v.number()),
    issueUrl: v.optional(v.string()),
    summary: v.string(),
    title: v.string(),
  },
  handler: (ctx, args) =>
    ctx.db.insert("bugReports", {
      ...args,
      notifiedStage: "reported",
      stage: "reported",
      tracking: args.issueNumber !== undefined,
    }),
});

/** A reporter's own reports, newest first. */
export const reportsOf = internalQuery({
  args: { accountId: v.string() },
  handler: async (ctx, { accountId }) => {
    const rows = await ctx.db
      .query("bugReports")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .order("desc")
      .take(20);
    return rows.map(publicReport);
  },
});

/** One of this reporter's reports, or null if it isn't theirs. */
export const reportOf = internalQuery({
  args: { accountId: v.string(), reportId: v.string() },
  handler: async (ctx, { accountId, reportId }) => {
    const id = ctx.db.normalizeId("bugReports", reportId);
    const report = id === null ? null : await ctx.db.get(id);
    return report?.accountId === accountId ? publicReport(report) : null;
  },
});

export type PublicReport = ReturnType<typeof publicReport>;

function publicReport(report: Doc<"bugReports">) {
  return {
    createdAt: report._creationTime,
    id: report._id,
    issueNumber: report.issueNumber ?? null,
    issueUrl: report.issueUrl ?? null,
    pullRequestUrl: report.pullRequest?.url ?? null,
    stage: report.stage,
    summary: report.summary,
    title: report.title,
  };
}

export const tracked = internalQuery({
  args: {},
  handler: (ctx) =>
    ctx.db
      .query("bugReports")
      .withIndex("by_tracking", (q) => q.eq("tracking", true))
      .take(100),
});

const progressValidator = v.object({
  delivery: v.optional(
    v.union(
      v.literal("update"),
      v.literal("build"),
      v.literal("server"),
      v.literal("unknown"),
    ),
  ),
  fix: v.optional(
    v.object({ app: v.boolean(), backend: v.boolean(), sha: v.string() }),
  ),
  pullRequest: v.optional(v.object({ number: v.number(), url: v.string() })),
  release: v.optional(v.string()),
  stage: reportStage,
  stateReason: v.optional(v.union(v.null(), v.string())),
});

type Progress = Infer<typeof progressValidator>;

/**
 * Records a report's progress and, when it reached a stage the reporter
 * hasn't heard about, tells them. A report that skipped stages gets only
 * the latest; one that went backwards (a reopened issue) gets nothing.
 */
export const advance = internalMutation({
  args: { progress: progressValidator, reportId: v.id("bugReports") },
  handler: async (ctx, { progress, reportId }) => {
    const report = await ctx.db.get(reportId);
    if (report === null) return;
    const notify = isNewStage(report.notifiedStage, progress.stage);
    const updated = {
      ...report,
      fix: progress.fix ?? report.fix,
      notifiedStage: notify ? progress.stage : report.notifiedStage,
      pullRequest: progress.pullRequest ?? report.pullRequest,
      stage: progress.stage,
      tracking: !isFinalStage(progress.stage),
    };
    await ctx.db.replace(reportId, updated);
    if (notify) await tellReporter(ctx, updated, progress);
  },
});

/** Sends the reporter the message for their report's new stage. */
async function tellReporter(
  ctx: MutationCtx,
  report: Doc<"bugReports">,
  progress: Progress,
) {
  const reporter = await ctx.db
    .query("supportReporters")
    .withIndex("by_account", (q) => q.eq("accountId", report.accountId))
    .unique();
  const message = updateMessage(report.stage, {
    ...progress,
    developer: reporter?.developer === true,
    issueUrl: report.issueUrl,
    pullRequest: report.pullRequest,
    sha: report.fix?.sha,
    summary: report.summary,
  });
  if (message !== null) {
    await sendAsBot(ctx, SUPPORT, report.conversationId, message);
  }
}

/**
 * Checks every open report's issue on GitHub (crons.ts runs it). Also an
 * operator command: `npx convex run supportReports:track`.
 */
export const track = internalAction({
  args: {},
  handler: async (ctx): Promise<{ checked: number }> => {
    const config = githubConfig();
    if (config === null) return { checked: 0 };
    const reports = await ctx.runQuery(internal.supportReports.tracked, {});
    const numbered = reports.flatMap((report) =>
      report.issueNumber === undefined
        ? []
        : [{ ...report, issueNumber: report.issueNumber }],
    );
    const states = await issueStates(
      config,
      numbered.map((report) => report.issueNumber),
    );
    const releases = lazyReleases(config);
    for (const report of numbered) {
      const state = states.get(report.issueNumber);
      if (state === undefined) continue;
      const update = await progressFrom(config, releases, state);
      const changed =
        update.stage !== report.stage ||
        update.stage !== report.notifiedStage ||
        update.pullRequest?.url !== report.pullRequest?.url;
      if (changed) {
        await ctx.runMutation(internal.supportReports.advance, {
          progress: update,
          reportId: report._id,
        });
      }
    }
    return { checked: numbered.length };
  },
});

type Releases = Awaited<ReturnType<typeof latestReleases>>;

/** The newest releases, read from GitHub the first time a fix needs them. */
function lazyReleases(config: GitHubConfig) {
  let releases: Promise<Releases> | null = null;
  return () => (releases ??= latestReleases(config));
}

/** A report's progress from its issue, and for a fix, whether it's out. */
async function progressFrom(
  config: GitHubConfig,
  releases: () => Promise<Releases>,
  state: IssueState,
): Promise<Progress> {
  const found = progressOf(state);
  const base = { ...found, stateReason: state.stateReason };
  if (found.stage === "fixed" && found.fix !== undefined) {
    return {
      ...base,
      ...(await delivered(config, await releases(), found.fix)),
    };
  }
  return found.stage === "live" ? { ...base, delivery: "unknown" } : base;
}

/** Whether a fix is in the releases it needs, and how it reached people. */
async function delivered(
  config: GitHubConfig,
  releases: Releases,
  fix: { app: boolean; backend: boolean; sha: string },
): Promise<{ delivery?: Delivery; release?: string; stage: ReportStage }> {
  async function includes(tag: string | null) {
    return tag !== null && (await tagIncludes(config, tag, fix.sha));
  }
  if (fix.backend && !(await includes(releases.backend))) {
    return { stage: "fixed" };
  }
  if (!fix.app) {
    return {
      delivery: "server",
      release: releases.backend ?? undefined,
      stage: "live",
    };
  }
  if (await includes(releases.update)) {
    return {
      delivery: "update",
      release: releases.update ?? undefined,
      stage: "live",
    };
  }
  if (await includes(releases.build)) {
    return {
      delivery: "build",
      release: releases.build ?? undefined,
      stage: "live",
    };
  }
  return { stage: "fixed" };
}

/**
 * Operator command: `npx convex run supportReports:list`. Every report,
 * newest first, with who sent it, for Shawn and his agents only (the
 * public issue never names the reporter).
 */
export const list = internalQuery({
  args: { open: v.optional(v.boolean()) },
  handler: async (ctx, { open }) => {
    const rows =
      open === true
        ? await ctx.db
            .query("bugReports")
            .withIndex("by_tracking", (q) => q.eq("tracking", true))
            .order("desc")
            .take(100)
        : await ctx.db.query("bugReports").order("desc").take(100);
    return rows.map((report) => ({
      ...publicReport(report),
      conversationId: report.conversationId,
      reporter: report.accountId,
    }));
  },
});
