import { z } from "zod";

export const promptDifficultyEnum = z.enum(["easy", "medium", "hard"]);
export type PromptDifficulty = z.infer<typeof promptDifficultyEnum>;

export const promptCategoryEnum = z.enum([
  "general",
  "search",
  "writing",
  "ui-code-gen",
  "stem",
]);
export type PromptCategory = z.infer<typeof promptCategoryEnum>;
