import { memo } from "react";
import { useSmoothText } from "@convex-dev/agent/react";
import { UIMessage } from "ai";
import { Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { isErrorMessage, isNoticeMessage } from "../util/message-util";
import { CopyButton } from "./copy-button";
import ErrorMessage from "./error-message";
import { markdownComponents } from "./markdown-components";
import NoticeMessage from "./notice-message";
import { MemoizedReasoningMessage } from "./reasoning-message";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getDateTimeString } from "@/features/date-time/util";

interface ResponseMessageProps {
  message: UIMessage;
  streaming: boolean;
}

export default function ResponseMessage({
  message,
  streaming,
}: ResponseMessageProps) {
  const [text] = useSmoothText(message.content, { charsPerSec: 2000 });
  const createdAt = getDateTimeString(new Date(message.createdAt ?? 0));

  const errorCode = isErrorMessage(text);
  if (errorCode) {
    return <ErrorMessage code={errorCode} dateTime={createdAt} />;
  }

  const noticeCode = isNoticeMessage(text);
  if (noticeCode) {
    return <NoticeMessage code={noticeCode} />;
  }

  return (
    <div className="flex w-full flex-col items-start gap-2">
      <MemoizedReasoningMessage message={message} streaming={streaming} />
      <div className="relative w-full">
        <div className="prose dark:prose-invert relative w-full max-w-full">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={markdownComponents}
          >
            {text}
          </ReactMarkdown>
          {!streaming && message.createdAt && message.content.length > 0 && (
            <div className="absolute -bottom-10 left-0 mt-2 flex justify-start gap-2 sm:-bottom-12">
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
              <CopyButton getContent={() => message.content} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const MemoizedResponse = memo(ResponseMessage);
