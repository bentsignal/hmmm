import { TableAggregate } from "@convex-dev/aggregate";
import {
  CustomCtx,
  customCtx,
  customMutation,
} from "convex-helpers/server/customFunctions";
import { Triggers } from "convex-helpers/server/triggers";
import { paginationOptsValidator, UserIdentity } from "convex/server";
import { ConvexError, Infer, v } from "convex/values";
import { internalQuery } from "@/convex/_generated/server";
import {
  apiMutation,
  authedMutation,
  authedQuery,
  checkApiKey,
  checkAuth,
} from "@/convex/convex_helpers";
import type { Plan } from "@/convex/user/subscription";
import { components, internal } from "../_generated/api";
import { DataModel, Doc } from "../_generated/dataModel";
import {
  internalMutation,
  mutation,
  MutationCtx,
  QueryCtx,
} from "../_generated/server";
import { limiter } from "../limiter";
import { getUserPlanHelper } from "../user/subscription";
import { LibraryFile } from "@/features/library/types";

const GB = 1024 * 1024 * 1024;

const storageLimits: Record<Plan["name"], number> = {
  Free: 0 * GB,
  Light: 5 * GB,
  Premium: 20 * GB,
  Ultra: 50 * GB,
  Unlimited: 100 * GB,
};

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

const internalStorageTriggerMutation = customMutation(
  internalMutation,
  customCtx(triggers.wrapDB),
);

export const getStorageHelper = async (
  ctx: QueryCtx | MutationCtx,
  userId: string,
) => {
  // how much storage a user is allowed to user, based
  // on their subscription tier
  const plan = await getUserPlanHelper(ctx, userId);
  const storageLimit = storageLimits[plan.name];

  // how much storage the user has actually used
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
  // make sure files exist, and belong to user
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

/**
 * Get the user facing data for a file
 * @param file
 * @returns
 */
export const getPublicFile = (file: Doc<"files">): LibraryFile => {
  return {
    id: file._id,
    key: file.key,
    url: getFileUrl(file.key),
    fileName: file.fileName,
    mimeType: file.fileType,
    size: file.size,
  };
};

const vFileMetadata = v.object({
  key: v.string(),
  name: v.string(),
  type: v.string(),
  size: v.number(),
});

const storeFileMetadata = async (
  ctx: CustomCtx<
    typeof apiStorageTriggerMutation | typeof internalStorageTriggerMutation
  >,
  userId: string,
  file: Infer<typeof vFileMetadata>,
) => {
  return await ctx.db.insert("files", {
    userId,
    fileName: file.name,
    fileType: file.type,
    key: file.key,
    size: file.size,
  });
};

/**
 * Store file metadata in convex after the files have
 * been uploaded to uploadthing storage.
 */
export const uploadFileMetadata = apiStorageTriggerMutation({
  args: {
    file: vFileMetadata,
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { file, userId } = args;
    return await storeFileMetadata(ctx, userId, file);
  },
});

/**
 * Store files after image generation.
 */
export const uploadFileMetadataInternal = internalStorageTriggerMutation({
  args: {
    file: vFileMetadata,
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { file, userId } = args;
    return await storeFileMetadata(ctx, userId, file);
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
      internal.app.actions.deleteFilesFromStorage,
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

export const getUserFiles = authedQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    direction: v.union(v.literal("asc"), v.literal("desc")),
    tab: v.union(v.literal("all"), v.literal("images"), v.literal("documents")),
    sort: v.union(v.literal("date")),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { paginationOpts, direction, tab, searchTerm } = args;
    let paginated;
    if (searchTerm) {
      paginated = await ctx.db
        .query("files")
        .withSearchIndex("search_file_name", (q) =>
          q.search("fileName", searchTerm).eq("userId", ctx.user.subject),
        )
        .filter((q) => {
          if (tab === "images") {
            return q.or(
              q.eq(q.field("fileType"), "image/jpeg"),
              q.eq(q.field("fileType"), "image/png"),
              q.eq(q.field("fileType"), "image/webp"),
            );
          } else if (tab === "documents") {
            return q.or(q.eq(q.field("fileType"), "application/pdf"));
          } else {
            return q.neq(q.field("fileType"), undefined);
          }
        })
        .paginate(paginationOpts);
    } else {
      paginated = await ctx.db
        .query("files")
        .withIndex("by_user", (q) => q.eq("userId", ctx.user.subject))
        .filter((q) => {
          if (tab === "images") {
            return q.or(
              q.eq(q.field("fileType"), "image/jpeg"),
              q.eq(q.field("fileType"), "image/png"),
              q.eq(q.field("fileType"), "image/webp"),
            );
          } else if (tab === "documents") {
            return q.eq(q.field("fileType"), "application/pdf");
          } else {
            return q.neq(q.field("fileType"), undefined);
          }
        })
        .order(direction)
        .paginate(paginationOpts);
    }
    return {
      ...paginated,
      page: paginated.page.map((file) => {
        if (!file) {
          return null;
        }
        return getPublicFile(file);
      }),
    };
  },
});

export const getStorageStatus = authedQuery({
  handler: async (ctx) => {
    const { storageUsed, storageLimit } = await getStorageHelper(
      ctx,
      ctx.user.subject,
    );
    return {
      storageUsed,
      storageLimit,
    };
  },
});

export const getFilesByName = internalQuery({
  args: {
    fileNames: v.array(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { fileNames, userId } = args;
    const files = [];
    for (const fileName of fileNames) {
      const file = await ctx.db
        .query("files")
        .withSearchIndex("search_file_name", (q) =>
          q.search("fileName", fileName).eq("userId", userId),
        )
        .first();
      if (!file) {
        continue;
      }
      files.push(file);
    }
    return files;
  },
});

const getFileByKeyHelper = async (ctx: QueryCtx, key: string) => {
  const file = await ctx.db
    .query("files")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  return file;
};

export const getFileByKeyInternal = internalQuery({
  args: {
    key: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { key, userId } = args;
    const file = await getFileByKeyHelper(ctx, key);
    if (!file) {
      return null;
    }
    if (file.userId !== userId) {
      throw new ConvexError("Unauthorized");
    }
    return getPublicFile(file);
  },
});

export const getFileByKey = authedQuery({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const { key } = args;
    const file = await getFileByKeyHelper(ctx, key);
    if (!file) {
      return null;
    }
    if (file.userId !== ctx.user.subject) {
      throw new ConvexError("Unauthorized");
    }
    return getPublicFile(file);
  },
});

export const getFilesByKeys = internalQuery({
  args: {
    keys: v.array(v.string()),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const { keys, userId } = args;
    const files = [];
    for (const key of keys) {
      const file = await getFileByKeyHelper(ctx, key);
      if (!file) {
        continue;
      }
      if (file.userId !== userId) {
        throw new ConvexError("Unauthorized");
      }
      files.push(file);
    }
    return files.map((file) => getPublicFile(file));
  },
});
