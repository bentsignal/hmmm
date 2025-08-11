// convex/example.ts
import { R2 } from "@convex-dev/r2";
import { components } from "./_generated/api";

export const r2 = new R2(components.r2);

export const { generateUploadUrl, syncMetadata } = r2.clientApi({
  checkUpload: async () => {},
  onUpload: async (ctx, bucket, key) => {
    const userIdentity = await ctx.auth.getUserIdentity();
    if (!userIdentity) return;
    await ctx.db.insert("files", {
      userId: userIdentity.subject,
      key,
    });
  },
});
