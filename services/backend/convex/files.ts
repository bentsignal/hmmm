import { ConvexError, v } from "convex/values";

import type { ActionCtx, MutationCtx } from "./_generated/server";
import { uploadSizeAllowed } from "../upload-limits";
import { action, mutation } from "./_generated/server";
import { bunnyStorageConfig, presignStorageUpload } from "./bunny";

// Messages store only public URLs, so the provider can change without
// touching message data.

async function requireAccount(ctx: ActionCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new ConvexError({ code: "AUTHENTICATED_ACCOUNT_REQUIRED" });
  }
  return identity;
}

function extensionOf(name: string) {
  const match = /\.([a-z0-9]{1,8})$/i.exec(name);
  return match?.[1]?.toLowerCase() ?? "bin";
}

/**
 * Where and how the app should upload one attachment. `size` is the file's
 * length in bytes, or 0 when the app doesn't know it.
 */
export const createUpload = action({
  args: {
    kind: v.union(v.literal("image"), v.literal("video"), v.literal("file")),
    mimeType: v.string(),
    name: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAccount(ctx);
    if (!uploadSizeAllowed(args.kind, args.size)) {
      throw new ConvexError({ code: "UPLOAD_TOO_LARGE" });
    }
    const storage = bunnyStorageConfig();
    if (storage === null) {
      return {
        protocol: "convex" as const,
        url: await ctx.storage.generateUploadUrl(),
      };
    }
    const path = `${storage.prefix}/${crypto.randomUUID()}.${extensionOf(args.name)}`;
    return {
      protocol: "put" as const,
      ...(await presignStorageUpload(storage, path, args.mimeType, args.size)),
    };
  },
});

/** Turns a finished Convex storage upload into a public URL. */
export const completeUpload = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await requireAccount(ctx);
    const url = await ctx.storage.getUrl(storageId);
    if (url === null) throw new ConvexError({ code: "UPLOAD_NOT_FOUND" });
    return { url };
  },
});
