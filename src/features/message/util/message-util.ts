import { ReactNode } from "react";

export function extractTextFromChildren(children: ReactNode) {
  if (Array.isArray(children)) {
    const elements = children.map((child) => {
      if (typeof child === "string") {
        return child;
      } else if (child.props.children) {
        return String(child.props.children);
      }
    });
    return elements.join("");
  }
  return "";
}
