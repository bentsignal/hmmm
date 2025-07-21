import { memo, useEffect, useRef } from "react";
import { UIMessage, useSmoothText } from "@convex-dev/agent/react";
import { Brain } from "lucide-react";
import {
  extractReasoningFromMessage,
  getLatestPartType,
} from "../util/message-util";
import { markdownComponents } from "./markdown-components";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { TextShimmer } from "@/components/ui/loader";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";

interface ReasoningMessageProps {
  message: UIMessage;
  streaming: boolean;
}

export default function ReasoningMessage({
  message,
  streaming,
}: ReasoningMessageProps) {
  // animate the reasoning label when the model is thinking
  const isReasoning = streaming && getLatestPartType(message) === "reasoning";

  // extract text from reasoning parts & smooth
  const content = extractReasoningFromMessage(message);
  const [text] = useSmoothText(content);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // auto scroll to bottom when actively reasoning
  useEffect(() => {
    if (isReasoning && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [text, isReasoning]);

  if (content.length === 0) return null;

  return (
    <div className="my-4 flex w-full flex-col items-start gap-2">
      <HoverCard openDelay={200} closeDelay={200}>
        <HoverCardTrigger>
          <div className={cn("flex items-center gap-2", "cursor-pointer")}>
            <Brain className="h-4 w-4" />
            <TextShimmer active={isReasoning} text="Reasoning" />
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          ref={scrollContainerRef}
          className={cn(
            "bg-card prose dark:prose-invert scrollbar-thin",
            "scrollbar-thumb-background scrollbar-track-transparent relative",
            "mt-2 max-h-96 w-full max-w-72 overflow-y-auto rounded-md border",
            "p-4 sm:max-w-2xl",
            isReasoning && "overflow-y-hidden",
          )}
          align="start"
        >
          <Markdown
            className="prose dark:prose-invert relative w-full max-w-full"
            components={markdownComponents}
          >
            {text}
          </Markdown>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}

export const MemoizedReasoningMessage = memo(ReasoningMessage);
