import { MemoizedResponse } from "./response-message";
import useStreamedMessage from "../hooks/use-streamed-messages";
import { useEffect } from "react";

interface StreamingMessageProps {
  threadId: string;
  staticMessageLength: number;
  setStreamedMessagesCount: (count: number) => void;
}

export default function StreamingMessage({
  threadId,
  staticMessageLength,
  setStreamedMessagesCount,
}: StreamingMessageProps) {
  // get live updates to messages via stream
  const { streamedMessages, streamedMessagesCount, finalMessage } =
    useStreamedMessage({
      threadId,
    });

  // pass number of streaming messages back up to message list compoennt
  useEffect(() => {
    setStreamedMessagesCount(streamedMessagesCount);
  }, [streamedMessagesCount, setStreamedMessagesCount]);

  // if no message is being streamed, then just render the static message list
  if (!finalMessage) return null;
  if (streamedMessages.results.length === staticMessageLength) return null;

  return <MemoizedResponse message={finalMessage} />;
}
