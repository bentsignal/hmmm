import { TableAggregate } from "@convex-dev/aggregate";
import {
  customCtx,
  customMutation,
} from "convex-helpers/server/customFunctions";
import { Triggers } from "convex-helpers/server/triggers";
import { ConvexError, v } from "convex/values";
import { mutation } from "@/convex/_generated/server";
import { components } from "../_generated/api";
import { DataModel } from "../_generated/dataModel";
import { limiter } from "../limiter";
import { getStorageHelper } from "./library_helpers";

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
      url: v.string(),
      name: v.string(),
      type: v.string(),
      size: v.number(),
    }),
    userId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const { file, key, userId } = args;

    if (!process.env.NEXT_CONVEX_INTERNAL_KEY) {
      throw new ConvexError("Internal key not set");
    }

    if (key !== process.env.NEXT_CONVEX_INTERNAL_KEY) {
      throw new ConvexError("Invalid key");
    }

    await ctx.db.insert("files", {
      userId,
      fileName: file.name,
      fileType: file.type,
      url: file.url,
      size: file.size,
    });
  },
});

export const verifyUpload = mutation({
  args: {
    userId: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, key } = args;

    // make sure request is internal, and not from client
    if (!process.env.NEXT_CONVEX_INTERNAL_KEY) {
      throw new ConvexError("Internal key not set");
    }
    if (key !== process.env.NEXT_CONVEX_INTERNAL_KEY) {
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

// export const deleteFile = storageTriggerMutation({
//   args: {
//     key: v.string(),
//   },
//   handler: async (ctx, args) => {
//     const { key } = args;
//     const userId = await ctx.auth.getUserIdentity();
//     if (!userId) {
//       throw new ConvexError("Unauthorized");
//     }

//     const file = await ctx.db.query("files").withIndex("by_user", (q) =>
//       q.eq("userId", userId),
//     ).first();
//     if (!file) {
//       throw new ConvexError("File not found");
//     }

//     await ctx.db.delete("files", {
//       userId,
//       key,
//     });
//   },
// });
