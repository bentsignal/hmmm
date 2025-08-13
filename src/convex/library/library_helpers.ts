import { MutationCtx, QueryCtx } from "../_generated/server";
import { getUserPlanHelper } from "../sub/sub_helpers";
import { storageLimits } from "./library_config";
import { storage } from "./library_mutations";

export const getStorageHelper = async (
  ctx: QueryCtx | MutationCtx,
  userId: string,
) => {
  const plan = await getUserPlanHelper(ctx, userId);
  const storageLimit = storageLimits[plan.name];

  const bounds: {
    lower: { key: number; inclusive: boolean };
    upper: { key: number; inclusive: boolean };
  } = {
    lower: { key: 0, inclusive: true },
    upper: { key: Date.now(), inclusive: true },
  };
  const storageUsed = await storage.sum(ctx, {
    namespace: userId,
    bounds,
  });

  return {
    storageLimit,
    storageUsed,
  };
};
