import {
  defineComponentDispatchers,
  routedQueryResult,
} from "@decentralized-convex/server";
import { ConvexError } from "convex/values";

import type { QueryCtx } from "./_generated/server.js";
import { mutation, query } from "./_generated/server.js";
import { isAffiliated } from "./affiliations.ts";
import { accountsProtocol } from "./protocol.ts";

export const { dispatchMutation, dispatchQueries, dispatchQuery } =
  defineComponentDispatchers({
    handlers: {
      mutations: {
        upsertMyProfile: async (ctx, { args, identity }) => {
          const accountId = requireAccountId(identity);
          const displayName = args.displayName.trim();
          if (displayName.length === 0 || displayName.length > 80) {
            throw new ConvexError({ code: "INVALID_DISPLAY_NAME" });
          }

          const profile = {
            accountId,
            avatarUrl: args.avatarUrl,
            displayName,
          };
          const affiliated = await isAffiliated(ctx, accountId);
          const existing = await ctx.db
            .query("profiles")
            .withIndex("by_account", (index) =>
              index.eq("accountId", accountId),
            )
            .unique();

          if (existing === null) {
            await ctx.db.insert("profiles", profile);
          } else {
            await ctx.db.patch(existing._id, {
              avatarUrl: profile.avatarUrl,
              displayName: profile.displayName,
            });
          }
          return { ...profile, affiliated };
        },
      },
      queries: {
        getMyProfile: async (ctx, { identity }) => {
          if (identity === null) return null;
          return findProfile(ctx, requireAccountId(identity));
        },
        getProfile: async (ctx, { args }) => {
          const accountId = args.accountId.trim().toLowerCase();
          const profile = await findProfile(ctx, accountId);
          // A PDS keeps only its own accounts' profiles, so one it doesn't
          // have is asked of the account's home PDS too.
          return profile ?? routedQueryResult(null, [accountId]);
        },
      },
    },
    mutation,
    protocol: accountsProtocol,
    query,
  });

function requireAccountId(
  identity: null | { accountId?: string; email?: string },
) {
  const accountId = (identity?.accountId ?? identity?.email)
    ?.trim()
    .toLowerCase();
  if (accountId?.includes("@") !== true) {
    throw new ConvexError({ code: "AUTHENTICATED_ACCOUNT_REQUIRED" });
  }
  return accountId;
}

async function findProfile(ctx: QueryCtx, accountId: string) {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_account", (index) => index.eq("accountId", accountId))
    .unique();
  return profile === null
    ? null
    : {
        accountId: profile.accountId,
        affiliated: await isAffiliated(ctx, accountId),
        avatarUrl: profile.avatarUrl,
        displayName: profile.displayName,
      };
}
