import { useSmoothText } from "@convex-dev/agent/react";
import {
  Brain,
  Clock,
  Code,
  File,
  Globe,
  Image as ImageIcon,
  Newspaper,
  Sun,
} from "lucide-react";
import { MyUIMessage } from "../types/message-types";
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
  message: MyUIMessage;
  isActive: boolean;
}) {
  const content = extractReasoningFromMessage(message);
  const [text] = useSmoothText(content);
  if (content.length === 0) return null;

  const statusLabel = getStatusLabel(message.parts);

  return (
    <div className="flex w-full flex-col items-start gap-2">
      <HoverCard openDelay={200} closeDelay={200}>
        <HoverCardTrigger>
          <div className="flex cursor-pointer items-center gap-2 py-0.5 select-none">
            {statusLabel === "Checking the time" ? (
              <Clock className="h-4 w-4" />
            ) : statusLabel === "Searching for information" ? (
              <Globe className="h-4 w-4" />
            ) : statusLabel === "Checking the news" ? (
              <Newspaper className="h-4 w-4" />
            ) : statusLabel === "Checking the weather" ? (
              <Sun className="h-4 w-4" />
            ) : statusLabel === "Analyzing files" ? (
              <File className="h-4 w-4" />
            ) : statusLabel === "Generating code" ? (
              <Code className="h-4 w-4" />
            ) : statusLabel === "Generating image" ? (
              <ImageIcon className="h-4 w-4" />
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
            className={cn(
              "scrollbar-thin scrollbar-thumb-transparent scrollbar-track-transparent",
              "h-64 w-full overflow-y-auto p-8",
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
