"use client";

import { MemoizedPrompt } from "./prompt-message";
import { MemoizedResponse } from "./response-message";
import "@/features/message/styles/github-dark.min.css";
import "@/features/message/styles/message-styles.css";
import useNonStreamingMessages from "@/features/message/hooks/use-non-streaming-messages";
import { toUIMessages } from "@convex-dev/agent/react";

export default function NonStreamingMessages({
  threadId,
}: {
  threadId: string;
}) {
  const { messages } = useNonStreamingMessages({
    threadId,
  });

  // cut out the most recent response message, which is shown by
  // the streaming messages component
  const uiMessages = toUIMessages(messages.results);
  if (uiMessages.length === 0) return null;
  const lastMessage = uiMessages[uiMessages.length - 1];

  return uiMessages
    .slice(0, lastMessage.role === "user" ? undefined : -1)
    .map((item) =>
      item.role === "user" ? (
        <MemoizedPrompt key={item.id} message={item} />
      ) : item.role === "assistant" && item.parts.length > 0 ? (
        <MemoizedResponse key={item.id} message={item} />
      ) : null,
    );
}
