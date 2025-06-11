"use client";

import { api } from "@/convex/_generated/api";
import { Preloaded, usePreloadedQuery } from "convex/react";
import Message from "./message";

export default function MessageList({
  preloadedMessages,
}: {
  preloadedMessages: Preloaded<typeof api.messages.get>;
}) {
  const messages = usePreloadedQuery(preloadedMessages);
  return (
    <div>
      {messages.map((message) => (
        <Message key={message._id} message={message.value} />
      ))}
    </div>
  );
}
