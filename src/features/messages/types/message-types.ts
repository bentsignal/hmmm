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
