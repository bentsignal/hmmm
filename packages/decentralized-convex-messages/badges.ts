import type { QueryCtx } from "./_generated/server.js";
import { activity, isUnseen } from "./activity.ts";
import { pendingInvites } from "./model.ts";

/**
 * The app icon badge for one account, counted the way the app counts its
 * Activity tab's badge: each activity item not yet seen (a conversation
 * with new messages, a message of yours with new reactions, or a thread
 * you're in with new replies; muted
 * conversations and spaces left out), plus each pending space invitation.
 *
 * Only this PDS's activity and invitations are counted, and a push
 * carries only its own account's count. A device signed into several
 * accounts shows the sum once the app is open.
 */
export async function badgeCount(
  ctx: QueryCtx,
  accountId: string,
  /** Whether the app shows threads (older ones can't clear their items). */
  threads: boolean,
) {
  const unseen = (await activity(ctx, accountId, threads)).filter(
    isUnseen,
  ).length;
  return unseen + (await pendingInvites(ctx, accountId)).length;
}
