"use client";

import PromptMessage from "./prompt-message";
import ResponseMessage from "./response-message";
import { Loader2 } from "lucide-react";
import "@/features/message/styles/github-dark.min.css";
import "@/features/message/styles/message-styles.css";
import { memo, useEffect, useState } from "react";
import useStaticMessages from "@/features/message/hooks/use-static-messages";
import useThreadStatus from "@/features/thread/hooks/use-thread-status";
import useThreadStore from "@/features/thread/store/thread-store";
import { toUIMessages } from "@convex-dev/agent/react";
import StreamingMessage from "./streaming-message";

const MemoizedPrompt = memo(PromptMessage);
const MemoizedResponse = memo(ResponseMessage);

interface MessageListProps {
  threadId: string;
  updateNumMessages: (numMessages: number) => void;
}

export default function MessageList({
  threadId,
  updateNumMessages,
}: MessageListProps) {
  const { staticMessages, staticMessagesCount } = useStaticMessages({
    threadId,
  });
  const { isThreadIdle } = useThreadStatus({ threadId });
  const [streamedMessagesCount, setStreamedMessagesCount] = useState(0);

  // set active thread when component mounts
  const setActiveThread = useThreadStore((state) => state.setActiveThread);
  useEffect(() => {
    setActiveThread(threadId);
    return () => {
      setActiveThread(null);
    };
  }, [threadId, setActiveThread]);

  // passed up to message list wrapper to provide info to scroll component
  useEffect(() => {
    updateNumMessages(staticMessagesCount);
  }, [staticMessagesCount, updateNumMessages]);

  const streaming = staticMessagesCount !== streamedMessagesCount;

  console.log(staticMessages);

  return (
    <>
      {toUIMessages(staticMessages.results).map((item, index) =>
        item.role === "user" ? (
          <MemoizedPrompt key={item.id} message={item} />
        ) : index === staticMessagesCount - 1 &&
          streaming ? null : item.role === "assistant" &&
          item.parts.length > 0 ? (
          <MemoizedResponse key={item.id} message={item} />
        ) : null,
      )}
      <StreamingMessage
        threadId={threadId}
        staticMessageLength={staticMessagesCount}
        setStreamedMessagesCount={setStreamedMessagesCount}
      />
      {staticMessagesCount % 2 !== 0 && !isThreadIdle && (
        <div className="flex items-center justify-start">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
    </>
  );
}
