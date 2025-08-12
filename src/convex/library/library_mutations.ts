import { ConvexError, v } from "convex/values";
import { mutation } from "@/convex/_generated/server";

export const uploadFileMetadata = mutation({
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
