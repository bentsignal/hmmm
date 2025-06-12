"use client";

import { api } from "@/convex/_generated/api";
import PromptMessage from "./prompt-message";
import ResponseMessage from "./response-message";
import "./tokyo-night-dark.min.css";
import { useThreadMessages } from "@convex-dev/agent/react";
import { useConvexAuth } from "convex/react";

export default function MessageList({ threadId }: { threadId: string }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const { results: messages } = useThreadMessages(
    api.threads.getThreadMessages,
    args,
    { initialNumItems: 10, stream: true },
  );

  if (isLoading) return null;

  return (
    <div className="mx-4 mb-8 flex h-full w-full max-w-4xl flex-col gap-16 px-4">
      {messages?.map((item) =>
        item.message?.role === "user" &&
        typeof item.message.content === "string" ? (
          <PromptMessage key={item._id} message={item.message.content} />
        ) : item.message?.role === "assistant" &&
          Array.isArray(item.message.content) ? (
          <ResponseMessage
            key={item._id}
            message={item.message.content
              .filter((item) => item.type === "text")
              .map((item) => item.text)
              .join("")}
          />
        ) : null,
      )}
    </div>
  );
}
