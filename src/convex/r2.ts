import { R2 } from "@convex-dev/r2";
import { components } from "@/convex/_generated/api";

export const r2 = new R2(components.r2);

export const { generateUploadUrl, syncMetadata } = r2.clientApi({
  checkUpload: async (ctx) => {
    throw new Error("Unauthorized");
    // const user = await ctx.auth.getUserIdentity();
    // if (!user) {
    //   throw new Error("Unauthorized");
    // }
    // TODO: sub check & rate limiting
  },
  onUpload: async (ctx, key) => {
    console.log("File uploaded successfully:", key);
  },
});
