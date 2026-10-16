import type { OperationArgs } from "@decentralized-convex/plugin";

import type { MutationCtx, QueryCtx } from "./_generated/server.js";
import type { messagesProtocol, NotificationSettings } from "./protocol.ts";
import { fail, getSpaceMember } from "./model.ts";

type Mutations = (typeof messagesProtocol)["mutations"];
type Args<Operation extends keyof Mutations> = OperationArgs<
  Mutations[Operation]
>;

/** The kinds of pushes an account can turn off. */
export type PushKind =
  | "channels"
  | "directMessages"
  | "groups"
  | "invites"
  | "reactions"
  | "replies"
  | "threadReplies";

function settingsRow(ctx: QueryCtx, accountId: string) {
  return ctx.db
    .query("notificationSettings")
    .withIndex("by_account", (index) => index.eq("accountId", accountId))
    .unique();
}

/** An account's push settings; everything is on until turned off. */
export async function notificationSettings(
  ctx: QueryCtx,
  accountId: string,
): Promise<NotificationSettings> {
  const row = await settingsRow(ctx, accountId);
  return {
    channels: row?.channels !== false,
    directMessages: row?.directMessages !== false,
    enabled: row?.enabled !== false,
    groups: row?.groups !== false,
    invites: row?.invites !== false,
    reactions: row?.reactions !== false,
    replies: row?.replies !== false,
    threadReplies: row?.threadReplies !== false,
  };
}

export async function setNotificationSettings(
  ctx: MutationCtx,
  self: string,
  args: Args<"setNotificationSettings">,
) {
  const row = await settingsRow(ctx, self);
  if (row === null) {
    await ctx.db.insert("notificationSettings", { accountId: self, ...args });
  } else {
    await ctx.db.patch(row._id, args);
  }
  return null;
}

/** Whether an account wants this kind of push at all. */
export async function wantsPush(
  ctx: QueryCtx,
  accountId: string,
  kind: PushKind,
) {
  const settings = await notificationSettings(ctx, accountId);
  return settings.enabled && settings[kind];
}

/** The push kind for a message in a conversation of this kind. */
export function messagePushKind(kind: "channel" | "direct" | "group") {
  return (
    {
      channel: "channels",
      direct: "directMessages",
      group: "groups",
    } as const
  )[kind];
}

export async function setSpaceMuted(
  ctx: MutationCtx,
  self: string,
  args: Args<"setSpaceMuted">,
) {
  const member = await getSpaceMember(ctx, args.spaceId, self);
  if (member === null) fail("SPACE_NOT_FOUND");
  // Unmuting starts clean: what came in while muted stays out of activity.
  const unmuted = member.muted === true && !args.muted;
  await ctx.db.patch(member._id, {
    muted: args.muted ? true : undefined,
    ...(unmuted ? { alertsSince: Date.now() } : {}),
  });
  return null;
}
