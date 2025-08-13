"use node";

import { utapi } from "@/server/uploadthing";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";

export const deleteFilesFromStorage = internalAction({
  args: {
    keys: v.array(v.string()),
  },
  handler: async (ctx, args) => await utapi.deleteFiles(args.keys),
});
