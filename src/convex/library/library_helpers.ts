import { UserIdentity } from "convex/server";
import { ConvexError } from "convex/values";
import { Doc } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { getUserPlanHelper } from "../sub/sub_helpers";
import { storage } from "./library_mutations";
import { storageLimits } from "@/features/library/config";
import { LibraryFile } from "@/features/library/types";

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
  user: UserIdentity,
  fileIds: Doc<"files">["_id"][],
) => {
  // make sure file exists, and belongs to user
  const files = [];
  for (const fileId of fileIds) {
    const file = await ctx.db.get(fileId);
    if (!file) {
      throw new ConvexError("File not found");
    }
    if (file.userId !== user.subject) {
      throw new ConvexError("Unauthorized");
    }
    files.push(file);
  }
  return files;
};

export const getFileUrl = (key: string) => {
  if (!process.env.UPLOADTHING_ORG_ID) {
    throw new ConvexError("UPLOADTHING_ORG_ID not set");
  }
  return `https://${process.env.UPLOADTHING_ORG_ID}.ufs.sh/f/${key}`;
};

export const getPublicFile = (file: Doc<"files">): LibraryFile => {
  return {
    id: file._id,
    url: getFileUrl(file.key),
    fileName: file.fileName,
    mimeType: file.fileType,
    size: file.size,
  };
};
