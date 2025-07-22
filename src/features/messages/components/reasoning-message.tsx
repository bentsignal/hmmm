import { memo, useEffect, useRef } from "react";
import { UIMessage, useSmoothText } from "@convex-dev/agent/react";
import { Brain } from "lucide-react";
import {
  extractReasoningFromMessage,
  getLatestPartType,
} from "../util/message-util";
import Abyss from "@/components/abyss";
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
      scrollContainerRef.current.scrollTo({
        top: Math.max(scrollContainerRef.current.scrollHeight - 500, 0),
        behavior: "smooth",
      });
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
          className={cn(
            "bg-card prose dark:prose-invert relative",
            "mt-2 max-h-96 w-full max-w-24 rounded-md border",
            "p-0 sm:max-w-2xl rounded-4xl overflow-hidden",
          )}
          align="start"
        >
          <Abyss bgColor="card" height={100} maskStart={20} maskEnd={80} />
          <div
            ref={scrollContainerRef}
            className={cn(
              "scrollbar-thin scrollbar-thumb-transparent scrollbar-track-transparent",
              "max-h-96 w-full overflow-y-auto p-12",
              isReasoning && "overflow-y-hidden select-none",
            )}
          >
            <Markdown className="prose dark:prose-invert relative w-full max-w-full">
              {text}
            </Markdown>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}

export const MemoizedReasoningMessage = memo(ReasoningMessage);
