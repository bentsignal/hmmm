import { useEffect, useRef } from "react";
import { UIMessage, useSmoothText } from "@convex-dev/agent/react";
import { Brain, Clock, Code, File, Globe, Newspaper, Sun } from "lucide-react";
import {
  extractReasoningFromMessage,
  getStatusLabel,
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

export default function MessageStatus({
  message,
  isActive,
}: {
  message: UIMessage;
  isActive: boolean;
}) {
  // extract text from reasoning parts & smooth
  const content = extractReasoningFromMessage(message);
  const [text] = useSmoothText(content);
  const statusLabel = getStatusLabel(message);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // auto scroll to bottom when actively reasoning
  useEffect(() => {
    if (isActive && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: Math.max(scrollContainerRef.current.scrollHeight - 500, 0),
        behavior: "smooth",
      });
    }
  }, [text, isActive]);

  if (content.length === 0) return null;

  return (
    <div className="my-4 flex w-full flex-col items-start gap-2">
      <HoverCard openDelay={200} closeDelay={200}>
        <HoverCardTrigger>
          <div className={cn("flex items-center gap-2 select-none")}>
            {/* , "cursor-pointer")}> */}
            {statusLabel === "Checking the time" ? (
              <Clock className="h-4 w-4" />
            ) : statusLabel === "Searching for information" ? (
              <Globe className="h-4 w-4" />
            ) : statusLabel === "Checking the news" ? (
              <Newspaper className="h-4 w-4" />
            ) : statusLabel === "Checking the weather" ? (
              <Sun className="h-4 w-4" />
            ) : statusLabel === "Analyzing file" ? (
              <File className="h-4 w-4" />
            ) : statusLabel === "Generating code" ? (
              <Code className="h-4 w-4" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            <TextShimmer active={isActive} text={statusLabel} />
          </div>
        </HoverCardTrigger>
        <HoverCardContent
          className={cn(
            "bg-card prose dark:prose-invert relative",
            "mt-2 w-lg rounded-md border",
            "overflow-hidden rounded-4xl p-0",
          )}
          align="start"
        >
          <Abyss color="card" height={50} blur="sm" />
          <div
            ref={scrollContainerRef}
            className={cn(
              "scrollbar-thin scrollbar-thumb-transparent scrollbar-track-transparent",
              "h-64 w-full overflow-y-auto p-6",
              isActive && "overflow-y-hidden select-none",
            )}
          >
            <Markdown className="prose dark:prose-invert relative w-full max-w-full text-sm">
              {text}
            </Markdown>
          </div>
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
