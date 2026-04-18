import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";

import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { checkAuth } from "./convex_helpers";
import { getUserInfoHelper } from "./user/info";
import { getUserPlanHelper } from "./user/subscription";
import { getUsageHelper } from "./user/usage";

// Pre-fetches userPlan, userInfo, and usage so helpers in the call graph can
// read them from ctx instead of re-running `getUserPlanHelper` (and its
// Polar + hasUnlimitedAccess reads) multiple times per invocation. Use this
// only for hot paths that actually need all three fields (sendMessage, create);
// cheaper mutations should stay on `authedMutation`.
async function buildUsageCheckedCtx(ctx: QueryCtx | MutationCtx) {
  const user = await checkAuth(ctx);
  const userId = user.subject;
  const [userPlan, userInfo] = await Promise.all([
    getUserPlanHelper(ctx, userId),
    getUserInfoHelper(ctx, userId),
  ]);
  const usage = await getUsageHelper(ctx, userId, userPlan);
  return { user, userPlan, userInfo, usage };
}

export const usageCheckedMutation = customMutation(
  mutation,
  customCtx(buildUsageCheckedCtx),
);

export const usageCheckedQuery = customQuery(
  query,
  customCtx(buildUsageCheckedCtx),
);
