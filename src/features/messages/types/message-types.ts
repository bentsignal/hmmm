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

// TODO: fix once upgraded to v5
const SourceSchema = z.object({
  url: z.string(),
  content: z.string(),
  title: z.string().optional().nullable(),
  favicon: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
});
export type Source = z.infer<typeof SourceSchema>;

export const ResultSchema = z.object({
  sources: z.array(SourceSchema),
});

export type ToolInvocationPartWithResult = ToolInvocationUIPart & {
  toolInvocation: {
    result?: unknown;
  };
};
