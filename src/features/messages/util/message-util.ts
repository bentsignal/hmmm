import { ReactNode } from "react";
import { Source } from "@/convex/ai/tools/search";
import {
  MyUIMessage,
  MyUIMessagePart,
  SystemErrorCode,
  SystemErrorLabel,
  SystemNoticeCode,
  SystemNoticeLabel,
} from "../types/message-types";
import { LibraryFile } from "@/features/library/types";

export function extractTextFromChildren(children: ReactNode): string {
  if (typeof children === "string") {
    return children;
  }
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join("");
  }
  if (
    typeof children === "object" &&
    children !== null &&
    "props" in children &&
    children.props &&
    typeof children.props === "object" &&
    children.props !== null &&
    "children" in children.props
  ) {
    return extractTextFromChildren(children.props.children as ReactNode);
  }
  return "";
}

export function extractReasoningFromMessage(message: MyUIMessage) {
  return message.parts
    .filter((part) => part.type === "reasoning")
    .map((part) => part.text)
    .join("\n");
}

export function getLatestPartType(message: MyUIMessage) {
  if (message.parts.length === 0) return null;
  return message.parts[message.parts.length - 1].type;
}

export function getStatusLabel(parts: MyUIMessagePart[]) {
  const part = parts[parts.length - 1];
  switch (part.type) {
    case "tool-dateTime":
      return "Checking the time";
    case "tool-weather":
      return "Checking the weather";
    case "tool-currentEvents":
      return "Checking the news";
    case "tool-fileAnalysis":
      return "Analyzing file";
    case "tool-codeGeneration":
      return "Generating code";
    case "tool-positionHolder":
      return "Searching for information";
    case "tool-initImage":
      return "Generating image";
    case "tool-generateImage":
      return "Generating image";
    default:
      return "Reasoning";
  }
}

export function formatError(code: SystemErrorCode) {
  return `${SystemErrorLabel}${code}`;
}

export function formatNotice(code: SystemNoticeCode) {
  return `${SystemNoticeLabel}${code}`;
}

export function isErrorMessage(message: string): SystemErrorCode | null {
  if (!message.startsWith(SystemErrorLabel)) return null;
  const code = message.replace(SystemErrorLabel, "") as SystemErrorCode;
  return code;
}

export function isNoticeMessage(message: string): SystemNoticeCode | null {
  if (!message.startsWith(SystemNoticeLabel)) return null;
  const code = message.replace(SystemNoticeLabel, "") as SystemNoticeCode;
  return code;
}

export function extractSourcesFromMessage(message: MyUIMessage) {
  const collected: Array<Source> = [];
  message.parts.forEach((part) => {
    if (
      (part.type === "tool-currentEvents" ||
        part.type === "tool-positionHolder") &&
      part.output
    ) {
      collected.push(...part.output.sources);
    }
  });
  return collected;
}

export function extractFilesFromMessage(message: MyUIMessage) {
  const collected: Array<LibraryFile> = [];
  message.parts.forEach((part) => {
    if (part.type === "tool-fileAnalysis" && part.output) {
      collected.push(...part.output.files);
    }
  });
  return collected;
}

export function extractImageFromMessage(message: MyUIMessage) {
  if (message.parts.length === 0) return null;
  const lastPart = message.parts[message.parts.length - 1];
  if (lastPart.type === "tool-initImage") {
    return "in-progress";
  }
  const key = message.parts.find((part) => part.type === "tool-generateImage")
    ?.output?.key;
  return key;
}

export const responseHasNoContent = (message: MyUIMessage) => {
  if (message.text.length > 0) return false;
  const reasoning = extractReasoningFromMessage(message);
  if (reasoning.length > 0) return false;
  const sources = extractSourcesFromMessage(message);
  if (sources.length > 0) return false;
  const files = extractFilesFromMessage(message);
  if (files.length > 0) return false;
  return true;
};
