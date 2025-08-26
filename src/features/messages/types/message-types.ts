import { UIMessage } from "@convex-dev/agent/react";
import { InferUITools, UIDataTypes, UIMessagePart } from "ai";
import { tools } from "@/convex/ai/tools";
import { LibraryFile } from "@/features/library/types/library-types";

export type SystemErrorCode = "G1" | "G2" | "G3" | "G4";

export type SystemNoticeCode = "N1";

export const SystemErrorLabel = "--SYSTEM_ERROR--";
export const SystemNoticeLabel = "--SYSTEM_NOTICE--";

export type MyTools = InferUITools<typeof tools>;
export type MyMetadata = {
  attachments?: LibraryFile[];
};
export type MyDataParts = UIDataTypes;

export type MyUIMessage = UIMessage<MyMetadata, MyDataParts, MyTools>;
export type MyUIMessagePart = UIMessagePart<MyDataParts, MyTools>;
