"use client";

import { api } from "@/convex/_generated/api";
import { Preloaded, usePreloadedQuery } from "convex/react";
import PromptMessage from "./prompt-message";
import ResponseMessage from "./response-message";
import "./tokyo-night-dark.min.css";

export default function MessageList({
  preloadedMessages,
}: {
  preloadedMessages: Preloaded<typeof api.threads.getThreadMessages>;
}) {
  const messages = usePreloadedQuery(preloadedMessages);
  return (
    <div className="mx-4 mb-8 flex h-full w-full max-w-4xl flex-col gap-16 px-4">
      {messages.map((item) =>
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
