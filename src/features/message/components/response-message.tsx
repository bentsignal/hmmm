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

interface ResponseMessageProps {
  message: string;
  creationTime: number | Date;
  containsToolCall: boolean;
}

export default function ResponseMessage({
  message,
  creationTime,
  containsToolCall,
}: ResponseMessageProps) {
  const [text] = useSmoothText(message, { charsPerSec: 300 });
  const createdAt = getDateAndTime(new Date(creationTime));
  return (
    <div className="relative w-full">
      <div className="prose dark:prose-invert relative w-full max-w-full">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={markdownComponents}
        >
          {text}
        </ReactMarkdown>
        {text.trim().length > 0 && !containsToolCall && (
          <div className="absolute -bottom-10 left-0 mt-2 flex justify-start gap-2 sm:-bottom-12">
            <CopyButton text={text} />
            {creationTime && (
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
  );
}
