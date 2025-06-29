import { ReactNode } from "react";
import { UIMessage } from "ai";

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
