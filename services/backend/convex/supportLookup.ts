import { tool } from "ai";
import { z } from "zod/v4";

import type { Turn } from "./agentTools";
import type { GitHubConfig } from "./github";
import type { Releases } from "./githubReleases";
import type { Reporter } from "./supportReporters";
import { anonymize, progressOf, releaseNeeds } from "../bug-reports";
import { internal } from "./_generated/api";
import {
  commentOnIssue,
  githubConfig,
  issueStates,
  pullRequestFix,
  searchRepository,
} from "./github";
import { delivered, lazyReleases } from "./githubReleases";
import { whyNotFile } from "./supportRules";

// Support's tools for what the team already knows: whether a problem was
// reported or fixed before, and following an existing issue instead of
// filing a duplicate.

/** Merged pull requests checked for whether they've shipped, per search. */
const CHECKED_FIXES = 3;

export function lookupTools(turn: Turn) {
  return {
    search_known_bugs: tool({
      description:
        "Search the team's existing bug reports (GitHub issues) and merged fixes for a problem, to see whether it's already reported, fixed, or out in an update. Use it before filing.",
      inputSchema: z.object({
        query: z
          .string()
          .describe("A few keywords, like 'photo sideways group'."),
      }),
      execute: async ({ query }) => {
        const config = githubConfig();
        if (config === null) return "Can't search right now.";
        return searchKnownBugs(config, query);
      },
    }),
    follow_known_bug: tool({
      description:
        "Follow an existing bug report (GitHub issue) for this person instead of filing a duplicate, so they hear when it's fixed. Optionally add what they told you to it.",
      inputSchema: z.object({
        issueNumber: z.number(),
        summary: z
          .string()
          .describe("A short everyday phrase for the reporter."),
        details: z
          .string()
          .optional()
          .describe(
            "Anything new they told you, for developers, posted publicly. Leave out if nothing new.",
          ),
      }),
      execute: (input) => followKnownBug(turn, input),
    }),
  };
}

async function searchKnownBugs(config: GitHubConfig, query: string) {
  const found = await searchRepository(config, query);
  const releases = lazyReleases(config);
  const fixes = await Promise.all(
    found.pullRequests.slice(0, CHECKED_FIXES).map(async (pr) => ({
      ...pr,
      status: await shipped(config, releases, pr.number),
    })),
  );
  return {
    fixes,
    issues: found.issues.map((issue) => ({
      ...issue,
      state:
        issue.state === "open"
          ? "open"
          : `closed (${(issue.stateReason ?? "completed").replace("_", " ")})`,
    })),
  };
}

async function shipped(
  config: GitHubConfig,
  releases: () => Promise<Releases>,
  number: number,
) {
  const { mergeCommit, paths } = await pullRequestFix(config, number);
  if (mergeCommit === null) return "not merged";
  const result = await delivered(config, await releases(), {
    ...releaseNeeds(paths),
    sha: mergeCommit,
  });
  if (result.stage !== "live") return "merged, not released yet";
  return result.delivery === "build"
    ? "out in the newest app version"
    : "out (closing and reopening the app gets it)";
}

async function followKnownBug(
  turn: Turn,
  {
    details,
    issueNumber,
    summary,
  }: { details?: string; issueNumber: number; summary: string },
) {
  const config = githubConfig();
  if (config === null) return "Can't follow reports right now.";
  const state = (await issueStates(config, [issueNumber])).get(issueNumber);
  if (state === undefined) return "No issue with that number.";
  if (details !== undefined && details.trim().length > 0) {
    const reporter: Reporter = await turn.ctx.runQuery(
      internal.supportReporters.reporter,
      { accountId: turn.accountId },
    );
    const blocked = await whyNotFile(turn, reporter);
    if (blocked !== null) return blocked;
    await commentOnIssue(
      config,
      issueNumber,
      `Someone else reported this through Vera Support:\n\n${anonymize(details, turn.accountId)}`,
    );
  }
  const found = progressOf(state);
  const progress =
    found.stage === "fixed" && found.fix !== undefined
      ? await delivered(config, await lazyReleases(config)(), found.fix)
      : found;
  await turn.ctx.runMutation(internal.supportReports.insert, {
    accountId: turn.accountId,
    conversationId: turn.conversationId,
    issueNumber,
    issueUrl: `https://github.com/${config.owner}/${config.name}/issues/${String(issueNumber)}`,
    stage: progress.stage,
    summary: summary.trim().slice(0, 120),
    title: `#${String(issueNumber)}`,
  });
  return {
    following: true,
    stage: progress.stage,
    note: "They'll hear from you here as it moves along. Tell them where it stands now.",
  };
}
