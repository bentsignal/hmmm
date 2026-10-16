import type { AccountProfile } from "@decentralized-convex/accounts";
import { accountsProtocol } from "@decentralized-convex/accounts";

import type { Doc } from "./_generated/dataModel.js";
import type { QueryCtx } from "./_generated/server.js";
import { env } from "./_generated/server.js";

// What message, reaction, and invitation pushes share.

/**
 * Android: the app's high-importance `messages` channel (the default
 * channel doesn't pop up), and high FCM priority, without which Android
 * delays or drops pushes while the app is closed or the phone is idle.
 */
export const ANDROID_DELIVERY = {
  channelId: "messages",
  priority: "high",
} as const;

export function previewText(message: Doc<"messages">) {
  if (message.body.length > 0) return message.body.slice(0, 200);
  const [first] = message.attachments;
  if (first === undefined) return "";
  const count = message.attachments.length;
  const noun = { file: "file", image: "photo", video: "video" }[first.kind];
  return count === 1 ? `Sent a ${noun}` : `Sent ${count} attachments`;
}

/** The group or channel name shown under the sender; null for DMs. */
export async function conversationName(
  ctx: QueryCtx,
  conversation: Doc<"conversations">,
) {
  if (conversation.kind === "direct") return null;
  if (conversation.kind === "group") return conversation.name ?? "Group";
  const space =
    conversation.spaceId === undefined
      ? null
      : await ctx.db
          .query("spaces")
          .withIndex("by_space", (index) =>
            index.eq("spaceId", conversation.spaceId ?? ""),
          )
          .unique();
  const channel = `#${conversation.name ?? "channel"}`;
  return space === null ? channel : `${space.name} ${channel}`;
}

/** Each account's display name (its username without a profile), in order. */
export async function displayNames(accountIds: readonly string[]) {
  const profiles = await Promise.all(accountIds.map(accountProfile));
  return accountIds.map(
    (accountId, index) =>
      [
        accountId,
        profiles[index]?.displayName ??
          accountId.slice(0, accountId.indexOf("@")),
      ] as const,
  );
}

/**
 * An account's Accounts profile, for their current display name and photo.
 * Messages are stored on the author's home PDS, so the sender's profile is
 * on this deployment (other members' may not be, and come back null), but a
 * Convex Component cannot read a sibling Component. It
 * asks this PDS's public root router instead, exactly as a client would
 * (`accounts.getProfile` needs no session). Messages requires `accounts`,
 * so the plugin is always installed. Any failure returns null and the
 * notification falls back to the name stored on the message.
 */
export async function accountProfile(accountId: string) {
  try {
    const response = await fetch(`${env.CONVEX_CLOUD_URL}/api/query`, {
      body: JSON.stringify({
        args: {
          lastChanged: accountsProtocol.lastChanged,
          operation: { args: { accountId }, type: "getProfile" },
          plugin: accountsProtocol.name,
          version: accountsProtocol.version,
        },
        format: "json",
        path: "pds:dispatchQuery",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    if (!response.ok) return null;
    return parseProfile(await response.json());
  } catch (error) {
    console.error("Profile lookup failed", error);
    return null;
  }
}

/** Reads `{ status, value: { value: profile } }` from the Convex HTTP API. */
function parseProfile(body: unknown): AccountProfile | null {
  const result = field(field(body, "value"), "value");
  const displayName = field(result, "displayName");
  const avatarUrl = field(result, "avatarUrl");
  const accountId = field(result, "accountId");
  if (typeof displayName !== "string" || typeof accountId !== "string") {
    return null;
  }
  return {
    accountId,
    avatarUrl: typeof avatarUrl === "string" ? avatarUrl : null,
    displayName,
  };
}

function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null
    ? Reflect.get(value, key)
    : undefined;
}
