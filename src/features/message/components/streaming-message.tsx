import { MemoizedResponse } from "./response-message";
import useStreamingMessage from "../hooks/use-streaming-message";
import MessageWaiting from "./message-waiting";
import useThreadStatus from "@/features/thread/hooks/use-thread-status";

interface StreamingMessageProps {
  threadId: string;
}

export default function StreamingMessage({ threadId }: StreamingMessageProps) {
  const { isThreadIdle } = useThreadStatus({ threadId });
  const { streamingMessage } = useStreamingMessage({
    threadId,
  });

  if (streamingMessage) {
    return <MemoizedResponse message={streamingMessage} />;
  } else {
    return <MessageWaiting isThreadIdle={isThreadIdle} />;
  }
}
