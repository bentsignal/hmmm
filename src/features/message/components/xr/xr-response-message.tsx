import { XR_COLORS } from "@/styles/xr-styles";
import { UIMessage, useSmoothText } from "@convex-dev/agent/react";
import { NOTICE_MESSAGES } from "../../data/notice-messages";
import type {
  SystemErrorCode,
  SystemNoticeCode,
} from "../../types/message-types";
import { isErrorMessage, isNoticeMessage } from "../../util/message-util";
import XRMarkdown from "./xr-markdown";
import { TextElement } from "@/components/xr";

export default function XRResponseMessage({ message }: { message: UIMessage }) {
  const [text] = useSmoothText(message.content, { charsPerSec: 2000 });

  const errorCode = isErrorMessage(text);
  if (errorCode) {
    return <ErrorMessage code={errorCode} />;
  }

  const noticeCode = isNoticeMessage(text);
  if (noticeCode) {
    return <NoticeMessage code={noticeCode} />;
  }

  return <XRMarkdown content={message.content} />;
}

const NoticeMessage = ({ code }: { code: SystemNoticeCode }) => (
  <TextElement>{NOTICE_MESSAGES[code]}</TextElement>
);

const ErrorMessage = ({ code }: { code: SystemErrorCode }) => (
  <TextElement color={XR_COLORS.destructive}>
    CODE: {code} An error occured while generating a response. Please try again.
  </TextElement>
);
