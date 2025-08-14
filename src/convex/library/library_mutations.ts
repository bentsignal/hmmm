import { TableAggregate } from "@convex-dev/aggregate";
import {
  customCtx,
  customMutation,
} from "convex-helpers/server/customFunctions";
import { Triggers } from "convex-helpers/server/triggers";
import { ConvexError, v } from "convex/values";
import { mutation } from "@/convex/_generated/server";
import { components, internal } from "../_generated/api";
import { DataModel } from "../_generated/dataModel";
import { limiter } from "../limiter";
import { getStorageHelper, verifyOwnership } from "./library_helpers";

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

const triggers = new Triggers<DataModel>();
triggers.register("files", storage.trigger());

const storageTriggerMutation = customMutation(
  mutation,
  customCtx(triggers.wrapDB),
);

export const uploadFileMetadata = storageTriggerMutation({
  args: {
    file: v.object({
      key: v.string(),
      name: v.string(),
      type: v.string(),
      size: v.number(),
    }),
    userId: v.string(),
    secretKey: v.string(),
  },
  handler: async (ctx, args) => {
    const { file, secretKey, userId } = args;

    if (!process.env.NEXT_CONVEX_INTERNAL_KEY) {
      throw new ConvexError("Internal key not set");
    }

    if (secretKey !== process.env.NEXT_CONVEX_INTERNAL_KEY) {
      throw new ConvexError("Invalid key");
    }

    await ctx.db.insert("files", {
      userId,
      fileName: file.name,
      fileType: file.type,
      key: file.key,
      size: file.size,
    });
  },
});

export const verifyUpload = mutation({
  args: {
    userId: v.string(),
    secretKey: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, secretKey } = args;

    // make sure request is internal, and not from client
    if (!process.env.NEXT_CONVEX_INTERNAL_KEY) {
      throw new ConvexError("Internal key not set");
    }
    if (secretKey !== process.env.NEXT_CONVEX_INTERNAL_KEY) {
      throw new ConvexError("Invalid key");
    }

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
    if (storageUsed >= storageLimit) {
      return {
        allow: false,
        reason: "Storage limit exceeded",
      };
    }

    return {
      allow: true,
      reason: "Upload allowed",
    };
  },
});

export const deleteFiles = storageTriggerMutation({
  args: {
    ids: v.array(v.id("files")),
  },
  handler: async (ctx, args) => {
    const { ids } = args;

    const files = await verifyOwnership(ctx, ids);

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

export const renameFile = mutation({
  args: {
    id: v.id("files"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, name } = args;

    await verifyOwnership(ctx, [id]);

    // update file name
    await ctx.db.patch(id, {
      fileName: name,
    });
  },
});
