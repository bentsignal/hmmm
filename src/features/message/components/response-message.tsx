import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { markdownComponents } from "./markdown-components";
import { useSmoothText } from "@convex-dev/agent/react";
import { CopyButton } from "./copy-button";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { getDateAndTime } from "@/lib/utils";
import { UIMessage } from "ai";
import { memo } from "react";

interface ResponseMessageProps {
  message: UIMessage;
}

export default function ResponseMessage({ message }: ResponseMessageProps) {
  const [text] = useSmoothText(message.content, { charsPerSec: 300 });
  const createdAt = getDateAndTime(new Date(message.createdAt ?? 0));
  return (
    <div className="flex flex-col items-start gap-2">
      {/* {(() => {
        const reasoningPart = item.parts.find(
          (part) => part.type === "reasoning" && part.reasoning.length > 0,
        );
        return reasoningPart && reasoningPart.type === "reasoning" ? (
          <MemoizedReasoningMessage
            key={`${item.id}-reasoning`}
            message={reasoningPart.reasoning}
            loading={!isThreadIdle}
            mostRecent={index === numMessages - 1}
          />
        ) : null;
      })()} */}
      <div className="relative w-full">
        <div className="prose dark:prose-invert relative w-full max-w-full">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={markdownComponents}
          >
            {text}
          </ReactMarkdown>
          {text.trim().length > 0 && (
            <div className="absolute -bottom-10 left-0 mt-2 flex justify-start gap-2 sm:-bottom-12">
              <CopyButton getContent={() => text} />
              {message.createdAt && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{createdAt}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const MemoizedResponse = memo(ResponseMessage);
