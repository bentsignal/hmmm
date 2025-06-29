import { MemoizedResponse } from "./response-message";
import useStreamingMessages from "../hooks/use-streaming-messages";
import { toUIMessages } from "@convex-dev/agent/react";
import MessageWaiting from "./message-waiting";
import useThreadStatus from "@/features/thread/hooks/use-thread-status";

interface StreamingMessageProps {
  threadId: string;
}

export default function StreamingMessages({ threadId }: StreamingMessageProps) {
  const { isThreadIdle } = useThreadStatus({ threadId });

  // updates to the last 2 most recent messages will be streamed in
  const { streamedMessages } = useStreamingMessages({
    threadId,
  });

  const uiMessages = toUIMessages(streamedMessages.results);
  if (uiMessages.length === 0) return null;

  // the most recent message is a repsonse, show it
  if (uiMessages.length === 1 && uiMessages[0].role === "assistant") {
    return <MemoizedResponse message={uiMessages[0]} />;
  }
  if (
    uiMessages.length === 2 &&
    uiMessages[0].role === "user" &&
    uiMessages[1].role === "assistant"
  ) {
    return <MemoizedResponse key={uiMessages[1].id} message={uiMessages[1]} />;
  }

  // if the most recent message isa prompt, show loading
  if (
    uiMessages.length === 2 &&
    uiMessages[0].role === "assistant" &&
    uiMessages[1].role === "user"
  ) {
    return <MessageWaiting isThreadIdle={isThreadIdle} />;
  }
  if (uiMessages.length === 1 && uiMessages[0].role === "user") {
    return <MessageWaiting isThreadIdle={isThreadIdle} />;
  }

  return null;
}
