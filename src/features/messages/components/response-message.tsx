import { UIMessage } from "@convex-dev/agent/react";
import { Info } from "lucide-react";
import {
  extractFilesFromMessage,
  extractSourcesFromMessage,
  isErrorMessage,
  isNoticeMessage,
} from "../util/message-util";
import { CopyButton } from "./copy-button";
import ErrorMessage from "./error-message";
import { MessageFiles } from "./message-files";
import { MessageSources } from "./message-sources";
import MessageStatus from "./message-status";
import NoticeMessage from "./notice-message";
import { Markdown } from "@/components/ui/markdown";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getDateTimeString } from "@/lib/date-time-utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTypewriter } from "@/hooks/use-typewriter";

export default function ResponseMessage({
  message,
  isActive,
  threadId,
}: {
  message: UIMessage;
  isActive: boolean;
  threadId: string;
}) {
  const { animatedText } = useTypewriter({
    inputText: message.text,
    streaming: message.status === "streaming",
  });
  const createdAt = getDateTimeString(new Date(message.createdAt ?? 0));
  const isMobile = useIsMobile();

  // error occured during repsonse generation, inform user
  const errorCode = isErrorMessage(animatedText);
  if (errorCode) {
    return <ErrorMessage code={errorCode} dateTime={createdAt} />;
  }

  // notice from the server to the user
  const noticeCode = isNoticeMessage(animatedText);
  if (noticeCode) {
    return <NoticeMessage code={noticeCode} />;
  }

  // // get web sources from message if they exist
  // const sources = extractSourcesFromMessage(message);

  // // files analyzed during response generation
  // const files = extractFilesFromMessage(message);

  // if the message begins with the substring "undefined", remove it from the
  // message. Not sure why this happens, seems to be a bug in a dependency
  const cleanedText = animatedText.replace(/^undefined/, "");

  return (
    <div className="flex w-full flex-col items-start gap-2">
      <MessageStatus message={message} isActive={isActive} />
      {/* <MessageFiles files={files} /> */}
      {/* <MessageSources threadId={threadId} sources={sources} /> */}
      <div className="relative flex w-full max-w-full flex-col gap-2">
        <Markdown className="prose dark:prose-invert relative w-full max-w-full">
          {cleanedText}
        </Markdown>
        {!isMobile && (
          <div
            className="mt-2 flex justify-start gap-2 transition-opacity duration-1000"
            style={{
              opacity:
                !isActive && message.createdAt && message.text.length > 0
                  ? 1
                  : 0,
            }}
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
            <CopyButton getContent={() => message.text} />
          </div>
        )}
      </div>
    </div>
  );
}
