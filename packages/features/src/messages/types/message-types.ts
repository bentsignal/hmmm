import type { UIDataTypes, UIMessagePart, UITools } from "ai";

import type { LibraryFile } from "../../library/types/library-types";
import type { UIMessage } from "../agent";

export type SystemErrorCode = "G1" | "G2" | "G3" | "G4";

export type SystemNoticeCode = "N1" | "N2";

export const SystemErrorLabel = "--SYSTEM_ERROR--";
export const SystemNoticeLabel = "--SYSTEM_NOTICE--";

export type MyTools = UITools;
export interface MyMetadata {
  attachments?: LibraryFile[];
}
export type MyDataParts = UIDataTypes;

export type MyUIMessage = UIMessage<MyMetadata, MyDataParts, MyTools>;
export type MyUIMessagePart = UIMessagePart<MyDataParts, MyTools>;
