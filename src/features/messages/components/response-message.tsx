import { memo } from "react";
import { UIMessage, useSmoothText } from "@convex-dev/agent/react";
import { Info } from "lucide-react";
import { isErrorMessage, isNoticeMessage } from "../util/message-util";
import { CopyButton } from "./copy-button";
import ErrorMessage from "./error-message";
import { markdownComponents } from "./markdown-components";
import NoticeMessage from "./notice-message";
import { MemoizedReasoningMessage } from "./reasoning-message";
import { Markdown } from "@/components/ui/markdown";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getDateTimeString } from "@/lib/date-time-utils";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

  // error occured during repsonse generation, inform user
  const errorCode = isErrorMessage(text);
  if (errorCode) {
    return <ErrorMessage code={errorCode} dateTime={createdAt} />;
  }

  // notice from the server to the user
  const noticeCode = isNoticeMessage(text);
  if (noticeCode) {
    return <NoticeMessage code={noticeCode} />;
  }

  // if the message begins with the substring "undefined", remove it from the
  // message. Not sure why this happens, seems to be a bug in a dependency
  const cleanedText = text.replace(/^undefined/, "");

  return (
    <div className="flex w-full flex-col items-start gap-2">
      <MemoizedReasoningMessage message={message} streaming={streaming} />
      <div className="relative w-full max-w-full">
        <Markdown
          className="prose dark:prose-invert relative w-full max-w-full"
          components={markdownComponents}
        >
          {cleanedText}
        </Markdown>
        {!streaming &&
          message.createdAt &&
          message.content.length > 0 &&
          !isMobile && (
            <div
              className="absolute -bottom-10 left-0 mt-2 flex justify-start 
              gap-2 sm:-bottom-12"
            >
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
  );
}

export const MemoizedResponse = memo(ResponseMessage);
