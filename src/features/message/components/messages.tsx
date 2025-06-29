"use client";

import { MemoizedPrompt } from "./prompt-message";
import { MemoizedResponse } from "./response-message";
import "@/features/message/styles/github-dark.min.css";
import "@/features/message/styles/message-styles.css";
import useMessages from "@/features/message/hooks/use-messages";

export default function Messages({ threadId }: { threadId: string }) {
  const { messages } = useMessages({
    threadId,
  });

  return messages.map((item) =>
    item.role === "user" ? (
      <MemoizedPrompt key={item.id} message={item} />
    ) : item.role === "assistant" && item.parts.length > 0 ? (
      <MemoizedResponse key={item.id} message={item} />
    ) : null,
  );
}
