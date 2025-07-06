import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { markdownComponents } from "./markdown-components";
import { useSmoothText } from "@convex-dev/agent/react";
import { cn } from "@/lib/utils";
import { UIMessage } from "ai";
import {
  extractReasoningFromMessage,
  getLatestPartType,
} from "../util/message-util";

interface ReasoningMessageProps {
  message: UIMessage;
  streaming: boolean;
}

export default function ReasoningMessage({
  message,
  streaming,
}: ReasoningMessageProps) {
  const [isOpen, setIsOpen] = useState(false);

  // if message is being streamed and the latest part is of type "reasoning",
  // then the model is currently in a reasoning state
  const isReasoning = streaming && getLatestPartType(message) === "reasoning";

  // extract text from reasoning parts & smooth
  const content = extractReasoningFromMessage(message);
  const [text] = useSmoothText(content);

  if (content.length === 0) return null;

  return (
    <div className="my-4 flex w-full flex-col items-start gap-2">
      <div
        className={cn("flex items-center gap-2", "cursor-pointer")}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4 " />
        )}
        <span
          className={cn(
            "mr-1 flex items-center gap-2 font-semibold",
            isReasoning && "animate-pulse",
          )}
        >
          <Brain className="h-4 w-4" />
          Reasoning
        </span>
      </div>
      {isOpen && (
        <div
          className="bg-card prose dark:prose-invert scrollbar-thin
          scrollbar-thumb-background scrollbar-track-transparent relative 
          mt-2 max-h-96 w-full max-w-72 overflow-y-auto rounded-md border 
          p-4 sm:max-w-full"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={markdownComponents}
          >
            {text}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export const MemoizedReasoningMessage = memo(ReasoningMessage);
