import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query } from "@/convex/_generated/server";
import { getFileUrl, getStorageHelper } from "./library_helpers";

export const listUserFiles = query({
  args: {
    paginationOpts: paginationOptsValidator,
    direction: v.union(v.literal("asc"), v.literal("desc")),
    tab: v.union(v.literal("all"), v.literal("images"), v.literal("documents")),
    sort: v.union(v.literal("date")),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { paginationOpts, direction, tab, searchTerm } = args;
    const userIdentity = await ctx.auth.getUserIdentity();
    if (!userIdentity) {
      throw new Error("Unauthorized");
    }
    let paginated;
    if (searchTerm) {
      paginated = await ctx.db
        .query("files")
        .withSearchIndex("search_file_name", (q) =>
          q.search("fileName", searchTerm).eq("userId", userIdentity.subject),
        )
        .filter((q) => {
          if (tab === "images") {
            return q.or(
              q.eq(q.field("fileType"), "image/jpeg"),
              q.eq(q.field("fileType"), "image/png"),
              q.eq(q.field("fileType"), "image/webp"),
            );
          } else if (tab === "documents") {
            return q.or(
              q.eq(q.field("fileType"), "application/pdf"),
              q.eq(q.field("fileType"), "text/plain"),
              q.eq(q.field("fileType"), "text/markdown"),
            );
          } else {
            return q.neq(q.field("fileType"), undefined);
          }
        })
        .paginate(paginationOpts);
    } else {
      paginated = await ctx.db
        .query("files")
        .withIndex("by_user", (q) => q.eq("userId", userIdentity.subject))
        .filter((q) => {
          if (tab === "images") {
            return q.or(
              q.eq(q.field("fileType"), "image/jpeg"),
              q.eq(q.field("fileType"), "image/png"),
              q.eq(q.field("fileType"), "image/webp"),
            );
          } else if (tab === "documents") {
            return q.or(
              q.eq(q.field("fileType"), "application/pdf"),
              q.eq(q.field("fileType"), "text/plain"),
              q.eq(q.field("fileType"), "text/markdown"),
            );
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
        return {
          id: file._id,
          url: getFileUrl(file.key),
          fileName: file.fileName,
          mimeType: file.fileType,
          size: file.size,
        };
      }),
    };
  },
});

export const getStorageStatus = query({
  handler: async (ctx) => {
    const userIdentity = await ctx.auth.getUserIdentity();
    if (!userIdentity) {
      throw new Error("Unauthorized");
    }
    const { storageUsed, storageLimit } = await getStorageHelper(
      ctx,
      userIdentity.subject,
    );
    return {
      storageUsed,
      storageLimit,
    };
  },
});
