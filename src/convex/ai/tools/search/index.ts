import z from "zod";
import { CurrentDateTime } from "@/lib/date-time-utils";

export const SourceSchema = z.object({
  url: z.string(),
  content: z.string(),
  title: z.string().optional().nullable(),
  favicon: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
});
export const CachedSourceSchema = z.object({
  sources: z.array(SourceSchema),
});
export type Source = z.infer<typeof SourceSchema>;

export type SearchReturnType = {
  sources: Source[];
  currentDateTime: {
    timezone: string;
    dateTime: CurrentDateTime;
  };
} | null;

export * from "./current_events";
export * from "./postition_holder";
