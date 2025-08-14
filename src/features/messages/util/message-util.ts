import { ReactNode } from "react";
import { UIMessage } from "@convex-dev/agent/react";
import { z } from "zod";
import {
  FileAnalysisResultSchema,
  FileResult,
  Source,
  SourceSchema,
  SystemErrorCode,
  SystemErrorLabel,
  SystemNoticeCode,
  SystemNoticeLabel,
  ToolInvocationPartWithResult,
  ToolInvocationUIPart,
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
  return message.parts[message.parts.length - 1].type;
}

export function getStatusLabel(message: UIMessage) {
  const latestPartType = getLatestPartType(message);
  switch (latestPartType) {
    default:
      return "Reasoning";
    case "reasoning":
      return "Reasoning";
    case "tool-invocation":
      const toolName = (
        message.parts[message.parts.length - 1] as ToolInvocationUIPart
      ).toolInvocation.toolName;
      switch (toolName) {
        case "dateTime":
          return "Checking the time";
        case "weather":
          return "Checking the weather";
        case "currentEvents":
          return "Checking the news";
        case "fileAnalysis":
          return "Analyzing file";
        default:
          return "Searching for information";
      }
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

export function extractSourcesFromMessage(message: UIMessage) {
  const collected: Array<Source> = [];
  // if only one tool call is made, then the result will just be an
  // array of sources. If multiple are made, then sources will just be
  // one of fields in the result object.
  const ArrayOrObjectResultSchema = z.union([
    z.array(SourceSchema),
    z.object({ sources: z.array(SourceSchema) }),
  ]);
  for (const part of message.parts) {
    if (part.type !== "tool-invocation") continue;
    // working around lack of type safety in v4
    // TODO: adjust once upgraded to v5
    const withResult = part as ToolInvocationPartWithResult;
    if (!("toolInvocation" in withResult)) continue;
    const parsed = ArrayOrObjectResultSchema.safeParse(
      withResult.toolInvocation.result,
    );
    if (!parsed.success) continue;
    if (Array.isArray(parsed.data)) {
      collected.push(...parsed.data);
    } else {
      collected.push(...parsed.data.sources);
    }
  }
  return collected;
}

export function extractFilesFromMessage(message: UIMessage) {
  const collected: Array<FileResult> = [];
  for (const part of message.parts) {
    if (part.type !== "tool-invocation") continue;
  }
  for (const part of message.parts) {
    if (part.type !== "tool-invocation") continue;
    const withResult = part as ToolInvocationPartWithResult;
    if (!("toolInvocation" in withResult)) continue;
    const parsed = FileAnalysisResultSchema.safeParse(
      withResult.toolInvocation.result,
    );
    if (!parsed.success) continue;
    collected.push(parsed.data.file);
  }
  return collected;
}
