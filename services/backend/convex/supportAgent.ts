import { tool } from "ai";
import { z } from "zod/v4";

import type { Assistant } from "./agent";
import type { Turn } from "./agentTools";
import type { Reporter } from "./supportReporters";
import type { PublicReport } from "./supportReports";
import { anonymize, issueFor } from "../bug-reports";
import { internal } from "./_generated/api";
import { conversationTools, sharedInstructions } from "./agentTools";
import { commentOnIssue, createIssue, githubConfig } from "./github";

// Vera Support's model: it helps someone describe a bug well, files it as a
// public, anonymized GitHub issue, and answers questions about their
// reports. Updates as a fix moves along come from supportReports.ts, not
// the model.

/** Sent word for word before anything is filed (`share_privacy_notice`). */
export const PRIVACY_NOTICE =
  "Heads up: bug reports, including screenshots, are posted publicly online so the team can work on them. We remove personal details, but we can't guarantee we'll catch everything, so please cross out anything private (names, messages, faces) before you send a screenshot.";

/** Reports one person can file a day, so nobody floods the public repo. */
const MAX_REPORTS_PER_DAY = 10;

const STAGE_WORDS = {
  closed: "closed (not being changed, or the same as another report)",
  fixed: "fixed, waiting to go out in an update",
  inProgress: "a fix is being worked on",
  live: "fixed and out",
  pickedUp: "someone on the team picked it up",
  reported: "reported, waiting for someone to pick it up",
} as const;

export const supportAssistant: Assistant = {
  instructions: async (turn) => {
    const [reporter, reports]: [Reporter, PublicReport[]] = await Promise.all([
      turn.ctx.runQuery(internal.supportReporters.reporter, {
        accountId: turn.accountId,
      }),
      turn.ctx.runQuery(internal.supportReports.reportsOf, {
        accountId: turn.accountId,
      }),
    ]);
    const app =
      reporter.client === null
        ? "Unknown. If it matters, ask them to open More > About and tell you the Version and Update lines."
        : `Version ${reporter.client.appVersion}, update ${reporter.client.update} (${reporter.client.channel}), ${reporter.client.device}, ${reporter.client.os}. This is attached to reports automatically; don't ask for it.`;
    const developer =
      reporter.developer === null
        ? "unknown"
        : reporter.developer
          ? "yes"
          : "no";
    const reportList =
      reports.length === 0
        ? "None."
        : reports
            .map(
              (report) =>
                `- [${report.id}] ${report.summary}: ${STAGE_WORDS[report.stage]}${reporter.developer === true ? `. ${linksOf(report)}` : ""}`,
            )
            .join("\n");
    return `${sharedInstructions(turn)}

You are Vera Support. People message you when something in the Vera app isn't working. Your job: understand the problem well enough for the team to fix it, file it, and keep them in the loop. Be warm, brief, and plain-spoken.

Getting a good report:
- Find out what went wrong, where in the app it happened, what they expected instead, and how to make it happen again (or whether it keeps happening). A screenshot or screen recording helps a lot; ask for one when it would.
- If they're vague ("something's broken"), ask what they were doing and what they saw. Ask one or two things at a time, not a checklist. Don't over-ask: once you know what happened and where, that's enough to file.
- Never ask for their messages, contacts, passwords, or other personal information. You only need to know what the app did.

Privacy, before anything is filed:
- Reports are public. Before you ask for a screenshot, or before filing if you haven't yet, call share_privacy_notice; it sends the notice for you, so don't repeat it in your own words. It has to happen before file_bug_report.
- If they sent screenshots before the notice, ask whether it's OK to include them after sharing it.
- Only include a screenshot in a report if it doesn't show personal things that aren't crossed out (other people's names, message text, faces, phone numbers, addresses). Otherwise leave it out and describe what it shows about the app (which screen, what looks wrong) in the details.
- In everything you file, never include their name or username, anyone else's name, message contents, addresses, phone numbers, or links. Describe instead ("a message from a friend", "a link to a video").

Filing:
- Use file_bug_report once you have enough. Write the title and details for a developer: specific, factual, concise. Write the summary for them: a short everyday phrase like "photos showing sideways in group chats".
- Feature requests and ideas are welcome too; file them with kind "idea".
- After filing, tell them in plain words that you passed it to the team and will message them here when it's fixed. Don't promise when.
- More details about something already filed go to add_to_bug_report, not a new report.

Talking about it:
- Their developer status: ${developer}. If unknown, after you file their first report, ask once, casually, whether they're a developer, since you can share the technical details as the fix moves along; record the answer with set_developer.
- If they're not a developer (or unknown), keep it non-technical: say "bug report" or "passed it to the team", never "issue", "GitHub", "ticket", "PR", or "merged".
- If they are a developer, you can be technical and share the links listed with their reports below. Only those links: never make up a link, issue number, or ID.
- If they ask how to do something in the app and you're not sure, say so. Don't invent features.

Their app: ${app}

Their reports (newest first):
${reportList}`;
  },
  tools: (turn: Turn) => ({
    ...conversationTools(turn),
    share_privacy_notice: tool({
      description:
        "Send the notice that reports and screenshots are public and should have private things crossed out. Required before file_bug_report.",
      inputSchema: z.object({}),
      execute: async () => {
        await turn.send(PRIVACY_NOTICE);
        await turn.ctx.runMutation(internal.supportReporters.updateReporter, {
          accountId: turn.accountId,
          noticeShared: true,
        });
        return "Sent.";
      },
    }),
    set_developer: tool({
      description:
        "Record whether this person is a developer who wants technical details.",
      inputSchema: z.object({ developer: z.boolean() }),
      execute: async ({ developer }) => {
        await turn.ctx.runMutation(internal.supportReporters.updateReporter, {
          accountId: turn.accountId,
          developer,
        });
        return "Saved.";
      },
    }),
    file_bug_report: tool({
      description:
        "File a bug report (or idea) for the team. It becomes a public, anonymized GitHub issue with their app version attached.",
      inputSchema: z.object({
        kind: z.enum(["bug", "idea"]),
        title: z.string().describe("A short, specific title for developers."),
        summary: z
          .string()
          .describe(
            "A short everyday phrase for the reporter, like 'photos showing sideways in group chats'.",
          ),
        details: z
          .string()
          .describe(
            "What happened, for developers, including what any left-out screenshots show about the app.",
          ),
        steps: z.string().optional().describe("How to make it happen."),
        expected: z.string().optional(),
        actual: z.string().optional(),
        screenshots: z
          .array(z.string())
          .describe(
            "References like 'image 2' of screenshots that are OK to include publicly. Empty for none.",
          ),
      }),
      execute: (input) => fileBugReport(turn, input),
    }),
    add_to_bug_report: tool({
      description:
        "Add details or screenshots to one of their reports that's already filed.",
      inputSchema: z.object({
        reportId: z.string(),
        details: z.string(),
        screenshots: z
          .array(z.string())
          .describe("References like 'image 3', OK to include publicly."),
      }),
      execute: (input) => addToBugReport(turn, input),
    }),
  }),
};

interface BugReportInput {
  readonly actual?: string;
  readonly details: string;
  readonly expected?: string;
  readonly kind: "bug" | "idea";
  readonly screenshots: string[];
  readonly steps?: string;
  readonly summary: string;
  readonly title: string;
}

/** Files a report as a public, anonymized issue, and keeps it to follow. */
async function fileBugReport(turn: Turn, input: BugReportInput) {
  const reporter: Reporter = await turn.ctx.runQuery(
    internal.supportReporters.reporter,
    { accountId: turn.accountId },
  );
  if (!reporter.noticeShared) {
    return "Not filed: call share_privacy_notice first, and let them answer before filing.";
  }
  const recent: PublicReport[] = await turn.ctx.runQuery(
    internal.supportReports.reportsOf,
    { accountId: turn.accountId },
  );
  const today = recent.filter(
    (report) => Date.now() - report.createdAt < 24 * 60 * 60 * 1000,
  );
  if (today.length >= MAX_REPORTS_PER_DAY) {
    return "Not filed: they've filed the most reports allowed in a day. Thank them and ask them to send the rest tomorrow.";
  }
  const screenshots = resolveImages(turn, input.screenshots);
  const issue = issueFor(
    { ...input, screenshots },
    turn.accountId,
    reporter.client,
  );
  const title = input.kind === "idea" ? `Idea: ${issue.title}` : issue.title;
  const created = await openIssue(input.kind, title, issue.body);
  const reportId = await turn.ctx.runMutation(internal.supportReports.insert, {
    accountId: turn.accountId,
    conversationId: turn.conversationId,
    issueNumber: created?.number,
    issueUrl: created?.url,
    summary: input.summary.trim().slice(0, 120),
    title,
  });
  return {
    filed: true,
    reportId,
    link:
      reporter.developer !== true
        ? "Not for this person (not a developer)."
        : (created?.url ?? "None; it's kept privately."),
  };
}

/** The new GitHub issue, or null when GitHub isn't set up or refused. */
async function openIssue(kind: "bug" | "idea", title: string, body: string) {
  const config = githubConfig();
  if (config === null) {
    console.log(
      `GitHub isn't set up; keeping the report on this PDS only.\n# ${title}\n\n${body}`,
    );
    return null;
  }
  try {
    return await createIssue(config, {
      body,
      labels: [kind === "idea" ? "enhancement" : "bug", "user report"],
      title,
    });
  } catch (error) {
    console.error("Couldn't create the GitHub issue", error);
    return null;
  }
}

/** Adds details to one of the person's own reports, as an issue comment. */
async function addToBugReport(
  turn: Turn,
  {
    details,
    reportId,
    screenshots,
  }: { details: string; reportId: string; screenshots: string[] },
) {
  const report: PublicReport | null = await turn.ctx.runQuery(
    internal.supportReports.reportOf,
    { accountId: turn.accountId, reportId },
  );
  if (report === null) return "No report of theirs with that ID.";
  const config = githubConfig();
  if (config === null || report.issueNumber === null) {
    return "Noted, but this report can't take more details right now.";
  }
  const urls = resolveImages(turn, screenshots);
  const body = [
    "More from the reporter:",
    "",
    anonymize(details, turn.accountId),
    ...urls.map((url, index) => `\n![Screenshot ${String(index + 1)}](${url})`),
  ].join("\n");
  await commentOnIssue(config, report.issueNumber, body);
  return "Added.";
}

/** A developer's links for a report, or that it has none. */
function linksOf(report: PublicReport) {
  if (report.issueUrl === null) return "No public link (kept privately)";
  return report.pullRequestUrl === null
    ? `Issue: ${report.issueUrl}`
    : `Issue: ${report.issueUrl}, fix: ${report.pullRequestUrl}`;
}

/** The URLs of images in this conversation by reference; others are dropped. */
function resolveImages(turn: Turn, refs: readonly string[]) {
  return refs
    .map((ref) => turn.images.get(ref.trim().toLowerCase()))
    .filter((url) => url !== undefined);
}
