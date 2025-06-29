import { ReactNode } from "react";

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
