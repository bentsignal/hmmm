import type { MutationCtx } from "./_generated/server.js";
import type { InboxKind } from "./protocol.ts";

/**
 * A device signed into several accounts registers its token once per
 * account, and gets each account's notifications.
 */
async function findToken(ctx: MutationCtx, self: string, token: string) {
  const rows = await ctx.db
    .query("pushTokens")
    .withIndex("by_token", (index) => index.eq("token", token))
    .collect();
  return rows.find((row) => row.accountId === self) ?? null;
}

function sameKinds(
  left: readonly InboxKind[] | undefined,
  right: readonly InboxKind[] | undefined,
) {
  return left?.join(",") === right?.join(",");
}

export async function registerPushToken(
  ctx: MutationCtx,
  self: string,
  {
    inbox,
    threads,
    token,
  }: { inbox?: InboxKind[]; threads?: boolean; token: string },
) {
  const existing = await findToken(ctx, self, token);
  const shows = threads === true ? true : undefined;
  if (existing === null) {
    await ctx.db.insert("pushTokens", {
      accountId: self,
      inbox,
      threads: shows,
      token,
    });
  } else if (existing.threads !== shows || !sameKinds(existing.inbox, inbox)) {
    // The app on the device was updated (or rolled back), or its Inbox
    // lists other kinds now.
    await ctx.db.patch(existing._id, { inbox, threads: shows });
  }
  return null;
}

export async function unregisterPushToken(
  ctx: MutationCtx,
  self: string,
  token: string,
) {
  const existing = await findToken(ctx, self, token);
  if (existing !== null) await ctx.db.delete(existing._id);
  return null;
}
