import { paginationOptsValidator } from "convex/server";
import { query } from "@/convex/_generated/server";
import { r2 } from "../r2";

export const listUserFiles = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userIdentity = await ctx.auth.getUserIdentity();
    if (!userIdentity) {
      throw new Error("Unauthorized");
    }
    const paginated = await ctx.db
      .query("files")
      .withIndex("by_user_key", (q) => q.eq("userId", userIdentity.subject))
      .order("desc")
      .paginate(args.paginationOpts);
    const files = await Promise.all(
      paginated.page.map(async (file) => {
        const metadata = await r2.getMetadata(ctx, file.key);
        const url = await r2.getUrl(file.key);
        return {
          ...file,
          metadata: {
            ...metadata,
            url,
          },
        };
      }),
    );
    return {
      ...paginated,
      page: files.map((file) => {
        if (!file.metadata) {
          return null;
        }
        if (!file.fileName) {
          return null;
        }
        return {
          url: file.metadata.url,
          fileName: file.fileName,
          fileType: file.metadata.contentType,
          size: file.metadata.size,
        };
      }),
    };
  },
});
