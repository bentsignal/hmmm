import type { Turn } from "./agentTools";
import type { Reporter } from "./supportReporters";
import type { PublicReport } from "./supportReports";
import { internal } from "./_generated/api";

// What has to be true before Vera Support puts anything in public: the
// person was told reports are public, and answered after.

/** Sent word for word before anything is filed (`share_privacy_notice`). */
export const PRIVACY_NOTICE =
  "Heads up: bug reports are posted publicly online so the team can work on them. Screenshots aren't posted; I describe what they show in words and leave out personal details, but I can't promise to catch everything, so please cross out anything private (names, messages, faces) before you send one.";

/** How long the privacy notice counts before support shares it again. */
const NOTICE_LIFETIME = 7 * 24 * 60 * 60 * 1000;

export function noticeCurrent(reporter: Reporter) {
  return (
    reporter.noticeSharedAt !== null &&
    Date.now() - reporter.noticeSharedAt < NOTICE_LIFETIME
  );
}

/** Reports one person can file a day, so nobody floods the public repo. */
const MAX_REPORTS_PER_DAY = 10;

/** Why a report can't be filed right now, or null when it can. */
export async function whyNotFile(turn: Turn, reporter: Reporter) {
  if (!noticeCurrent(reporter)) {
    return "Not filed: call share_privacy_notice first, and let them answer before filing.";
  }
  // They get to see the notice, and decide what to share, before anything
  // goes public.
  if ((reporter.noticeSharedAt ?? 0) > turn.lastHeardAt) {
    return "Not filed yet: they haven't answered since the privacy notice. Wait for their reply.";
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
  return null;
}
