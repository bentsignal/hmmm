"use node";

import { v } from "convex/values";
import { utapi } from "@/convex/uploadthing";
import { internalAction } from "../_generated/server";

export const deleteFilesFromStorage = internalAction({
  args: {
    keys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await utapi.deleteFiles(args.keys);
  },
});
