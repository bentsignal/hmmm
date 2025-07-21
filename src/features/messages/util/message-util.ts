import { ReactNode } from "react";
import { UIMessage } from "@convex-dev/agent/react";
import {
  SystemErrorCode,
  SystemErrorLabel,
  SystemNoticeCode,
  SystemNoticeLabel,
} from "../types/message-types";

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

export function extractReasoningFromMessage(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "reasoning")
    .map((part) => part.reasoning)
    .join("\n");
}

export function getLatestPartType(message: UIMessage) {
  if (message.parts.length === 0) return null;
  return message.parts[0].type;
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
