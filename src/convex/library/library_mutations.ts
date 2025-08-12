import { ConvexError, v } from "convex/values";
import { mutation } from "@/convex/_generated/server";
import { MAX_FILE_UPLOADS } from "@/features/library/config";

export const uploadFileMetadata = mutation({
  args: {
    files: v.array(
      v.object({
        key: v.string(),
        name: v.string(),
        type: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { files } = args;

    // auth and input validation
    const userIdentity = await ctx.auth.getUserIdentity();
    if (!userIdentity) {
      throw new ConvexError("Unauthorized");
    }
    if (files.length === 0) {
      return [];
    }
    if (files.length > MAX_FILE_UPLOADS) {
      throw new ConvexError(
        `Can't upload more than ${MAX_FILE_UPLOADS} files at a time`,
      );
    }

    // add file metadata to each document
    await Promise.all(
      files.map(async (file) => {
        const existingFile = await ctx.db
          .query("files")
          .withIndex("by_user_key", (q) =>
            q.eq("userId", userIdentity.subject).eq("key", file.key),
          )
          .first();
        if (existingFile) {
          await ctx.db.patch(existingFile._id, {
            fileName: file.name,
            fileType: file.type,
          });
        }
      }),
    );
  },
});
