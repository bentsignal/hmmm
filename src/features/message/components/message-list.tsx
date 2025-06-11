"use client";

import { api } from "@/convex/_generated/api";
import { Preloaded, usePreloadedQuery } from "convex/react";
import PromptMessage from "./prompt-message";
import ResponseMessage from "./response-message";

export default function MessageList({
  preloadedMessages,
}: {
  preloadedMessages: Preloaded<typeof api.messages.get>;
}) {
  const messages = usePreloadedQuery(preloadedMessages);
  return (
    <div className="mx-4 flex h-full w-full flex-col gap-4 px-4">
      {messages.map((message) =>
        message.type === "prompt" ? (
          <PromptMessage key={message._id} message={message} />
        ) : message.type === "response" ? (
          <ResponseMessage key={message._id} message={message} />
        ) : null,
      )}
    </div>
  );
}
