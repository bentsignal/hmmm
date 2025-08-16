import { TableAggregate } from "@convex-dev/aggregate";
import {
  customCtx,
  customMutation,
} from "convex-helpers/server/customFunctions";
import { Triggers } from "convex-helpers/server/triggers";
import { v } from "convex/values";
import {
  apiMutation,
  authedMutation,
  checkApiKey,
  checkAuth,
} from "@/convex/convex_helpers";
import { components, internal } from "../_generated/api";
import { DataModel } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { limiter } from "../limiter";
import { getStorageHelper, verifyOwnership } from "./library_helpers";

// this table stores the total storage used by each user
export const storage = new TableAggregate<{
  Namespace: string;
  Key: number;
  DataModel: DataModel;
  TableName: "files";
}>(components.aggregateStorage, {
  namespace: (doc) => doc.userId,
  sortKey: (doc) => doc._creationTime,
  sumValue: (doc) => doc.size,
});

/*

  These custom mutations cause the aggregate table above to be updated. 
  The aggregate table will not be updated if a normal mutation is used.

*/
const triggers = new Triggers<DataModel>();
triggers.register("files", storage.trigger());

const apiStorageTriggerMutation = customMutation(mutation, {
  args: {
    apiKey: v.string(),
  },
  input: async (ctx, args) => {
    checkApiKey(args.apiKey);
    const wrappedCtx = triggers.wrapDB(ctx);
    return { ctx: wrappedCtx, args };
  },
});

const authedStorageTriggerMutation = customMutation(
  authedMutation,
  customCtx(async (ctx) => {
    const user = await checkAuth(ctx);
    const wrappedCtx = triggers.wrapDB(ctx);
    return { ...wrappedCtx, user };
  }),
);

/**
 * Called by uploadthing (core.ts) to store file metadata after the
 * files have been uploaded to storage.
 */
export const uploadFileMetadata = apiStorageTriggerMutation({
  args: {
    file: v.object({
      key: v.string(),
      name: v.string(),
      type: v.string(),
      size: v.number(),
    }),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { file, userId } = args;
    await ctx.db.insert("files", {
      userId,
      fileName: file.name,
      fileType: file.type,
      key: file.key,
      size: file.size,
    });
  },
});

/**
 * Called by uploadthing middleware (core.ts) to verify that the
 * user is allowed to upload.
 */
export const verifyUpload = apiMutation({
  args: {
    userId: v.string(),
    payloadSize: v.number(),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, payloadSize } = args;

    // make sure user is not uploading too fast
    const { ok } = await limiter.limit(ctx, "upload", {
      key: userId,
    });
    if (!ok) {
      return {
        allow: false,
        reason: "Uploading too fast, try again shortly",
      };
    }

    // make sure user is not exceeding their storage limit
    const { storageUsed, storageLimit } = await getStorageHelper(ctx, userId);
    if (storageUsed + payloadSize >= storageLimit) {
      return {
        allow: false,
        reason: "Not enough storage space for this upload",
      };
    }

    return {
      allow: true,
      reason: "Upload allowed",
    };
  },
});

export const deleteFiles = authedStorageTriggerMutation({
  args: {
    ids: v.array(v.id("files")),
  },
  handler: async (ctx, args) => {
    const { ids } = args;
    const files = await verifyOwnership(ctx, ctx.user, ids);

    // delete file from db
    for (const file of files) {
      await ctx.db.delete(file._id);
    }

    // delete file from storage
    await ctx.scheduler.runAfter(
      0,
      internal.library.library_actions.deleteFilesFromStorage,
      {
        keys: files.map((file) => file.key),
      },
    );
  },
});

export const renameFile = authedMutation({
  args: {
    id: v.id("files"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, name } = args;

    await verifyOwnership(ctx, ctx.user, [id]);

    // update file name
    await ctx.db.patch(id, {
      fileName: name,
    });
  },
});
