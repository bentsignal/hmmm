import { Doc } from "../_generated/dataModel";
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

export const verifyOwnership = async (
  ctx: QueryCtx | MutationCtx,
  fileIds: Doc<"files">["_id"][],
) => {
  // auth check
  const userId = await ctx.auth.getUserIdentity();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  // make sure file exists, and belongs to user
  const files = [];
  for (const fileId of fileIds) {
    const file = await ctx.db.get(fileId);
    if (!file) {
      throw new Error("File not found");
    }
    if (file.userId !== userId.subject) {
      throw new Error("Unauthorized");
    }
    files.push(file);
  }
  return files;
};

export const getFileUrl = (key: string) => {
  if (!process.env.UPLOADTHING_ORG_ID) {
    throw new Error("UPLOADTHING_ORG_ID not set");
  }
  return `https://${process.env.UPLOADTHING_ORG_ID}.ufs.sh/f/${key}`;
};
