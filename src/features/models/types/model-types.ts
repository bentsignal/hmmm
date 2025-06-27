import { z } from "zod";

export const promptCategoryEnum = z.enum(["general", "complex", "search"]);
export type PromptCategory = z.infer<typeof promptCategoryEnum>;
