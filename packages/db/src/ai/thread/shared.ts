import { v } from "convex/values";

export const vAttachment = v.object({
  key: v.string(),
  name: v.string(),
  mimeType: v.string(),
});
