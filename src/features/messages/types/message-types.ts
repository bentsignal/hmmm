import { z } from "zod";

export type SystemErrorCode = "G1" | "G2" | "G3" | "G4";

export type SystemNoticeCode = "N1";

export const SystemErrorLabel = "--SYSTEM_ERROR--";
export const SystemNoticeLabel = "--SYSTEM_NOTICE--";

export interface ToolInvocationUIPart {
  type: "tool-invocation";
  toolInvocation: {
    toolName: string;
  };
}

export type ToolInvocationPartWithResult = ToolInvocationUIPart & {
  toolInvocation: {
    result?: unknown;
  };
};

export const SourceSchema = z.object({
  url: z.string(),
  content: z.string(),
  title: z.string().optional().nullable(),
  favicon: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
});
export type Source = z.infer<typeof SourceSchema>;

const fileSchema = z.object({
  id: z.string(),
  url: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});
export type FileResult = z.infer<typeof fileSchema>;
export const FileAnalysisResultSchema = z.object({
  file: fileSchema,
  response: z.string(),
});
export type FileAnalysisResult = z.infer<typeof FileAnalysisResultSchema>;
