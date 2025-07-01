import { z } from "zod";
import { v } from "convex/values";

export const promptDifficultyEnum = z.enum(["easy", "medium", "hard"]);
export type PromptDifficulty = z.infer<typeof promptDifficultyEnum>;
export const convexDifficultyEnum = v.union(
  v.literal("easy"),
  v.literal("medium"),
  v.literal("hard"),
);

export const promptCategoryEnum = z.enum([
  "general",
  "search",
  "writing",
  "ui-code-gen",
  "stem",
]);
export const convexCategoryEnum = v.union(
  v.literal("general"),
  v.literal("search"),
  v.literal("writing"),
  v.literal("ui-code-gen"),
  v.literal("stem"),
);
export type PromptCategory = z.infer<typeof promptCategoryEnum>;
