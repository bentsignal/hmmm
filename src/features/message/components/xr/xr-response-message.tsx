import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { UIMessage, useSmoothText } from "@convex-dev/agent/react";
import { Container, Text } from "@react-three/uikit";
import { Brain } from "@react-three/uikit-lucide";
import { NOTICE_MESSAGES } from "../../data/notice-messages";
import type {
  SystemErrorCode,
  SystemNoticeCode,
} from "../../types/message-types";
import {
  getLatestPartType,
  isErrorMessage,
  isNoticeMessage,
} from "../../util/message-util";
import XRMarkdown from "./xr-markdown";
import { TextElement } from "@/components/xr";

export default function XRResponseMessage({
  message,
  streaming,
}: {
  message: UIMessage;
  streaming?: boolean;
}) {
  const [text] = useSmoothText(message.content, { charsPerSec: 2000 });

  // error occured during repsonse generation, inform user
  const errorCode = isErrorMessage(text);
  if (errorCode) {
    return <ErrorMessage code={errorCode} />;
  }

  // notices from server, currently just that you need premium for web results
  const noticeCode = isNoticeMessage(text);
  if (noticeCode) {
    return <NoticeMessage code={noticeCode} />;
  }

  const isReasoning = streaming && getLatestPartType(message) === "reasoning";
  if (isReasoning) {
    return (
      <Container alignItems="center" gap={XR_STYLES.spacingMd}>
        <Brain
          width={XR_STYLES.textMd}
          height={XR_STYLES.textMd}
          color={XR_COLORS.foreground}
        />
        <Text color={XR_COLORS.foreground}>Reasoning...</Text>
      </Container>
    );
  }

  // if the message begins with the substring "undefined", remove it from the
  // message. Not sure why this happens, seems to be a bug in a dependency
  const cleanedText = text.replace(/^undefined/, "");

  return <XRMarkdown content={cleanedText} />;
}

const NoticeMessage = ({ code }: { code: SystemNoticeCode }) => (
  <TextElement>{NOTICE_MESSAGES[code]}</TextElement>
);

const ErrorMessage = ({ code }: { code: SystemErrorCode }) => (
  <TextElement color={XR_COLORS.destructive}>
    CODE: {code} An error occured while generating a response. Please try again.
  </TextElement>
);
