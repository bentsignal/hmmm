"use client";

import { api } from "@/convex/_generated/api";
import PromptMessage from "./prompt-message";
import ResponseMessage from "./response-message";
import "./tokyo-night-dark.min.css";
import { useThreadMessages, toUIMessages } from "@convex-dev/agent/react";
import { useConvexAuth } from "convex/react";

export default function MessageList({ threadId }: { threadId: string }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const args = isAuthenticated ? { threadId } : "skip";
  const messages = useThreadMessages(api.threads.getThreadMessages, args, {
    initialNumItems: 10,
    stream: true,
  });

  if (isLoading) return null;

  return (
    <div className="mx-4 mb-8 flex h-full w-full max-w-4xl flex-col gap-16 px-4">
      {toUIMessages(messages?.results ?? []).map((item) =>
        item.role === "user" ? (
          <PromptMessage key={item.id} message={item.content} />
        ) : item.role === "assistant" ? (
          <ResponseMessage key={item.id} message={item.content} />
        ) : null,
      )}
    </div>
  );
}
