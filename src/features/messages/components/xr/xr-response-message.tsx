import { hexColors, xrStyles } from "@/styles";
import { UIMessage } from "@convex-dev/agent/react";
import { Container, Text } from "@react-three/uikit";
import { Brain, Clock, Globe, Newspaper, Sun } from "@react-three/uikit-lucide";
import { NOTICE_MESSAGES } from "../../data/notice-messages";
import type {
  SystemErrorCode,
  SystemNoticeCode,
} from "../../types/message-types";
import {
  getStatusLabel,
  isErrorMessage,
  isNoticeMessage,
} from "../../util/message-util";
import XRMarkdown from "./xr-markdown";
import { TextElement } from "@/components/xr";

export default function XRResponseMessage({ message }: { message: UIMessage }) {
  // error occured during repsonse generation, inform user
  const errorCode = isErrorMessage(message.content);
  if (errorCode) {
    return <ErrorMessage code={errorCode} />;
  }

  // notices from server, currently just that you need premium for web results
  const noticeCode = isNoticeMessage(message.content);
  if (noticeCode) {
    return <NoticeMessage code={noticeCode} />;
  }

  // if the message begins with the substring "undefined", remove it from the
  // message. Not sure why this happens, seems to be a bug in a dependency
  const cleanedText = message.content.replace(/^undefined/, "");

  return (
    <Container
      flexDirection="column"
      gap={xrStyles.spacingLg}
      flexShrink={0}
      flexWrap="wrap"
    >
      <MessageStatus message={message} />
      <XRMarkdown content={cleanedText} />
    </Container>
  );
}

const MessageStatus = ({ message }: { message: UIMessage }) => {
  const statusLabel = getStatusLabel(message);
  const iconStyles = {
    width: xrStyles.textMd,
    height: xrStyles.textMd,
    color: hexColors.foreground,
  };
  return (
    <Container alignItems="center" gap={xrStyles.spacingMd}>
      {statusLabel === "Checking the time" ? (
        <Clock {...iconStyles} />
      ) : statusLabel === "Reasoning" ? (
        <Brain {...iconStyles} />
      ) : statusLabel === "Searching for information" ? (
        <Globe {...iconStyles} />
      ) : statusLabel === "Checking the news" ? (
        <Newspaper {...iconStyles} />
      ) : statusLabel === "Checking the weather" ? (
        <Sun {...iconStyles} />
      ) : (
        <Brain {...iconStyles} />
      )}
      <Text color={hexColors.foreground}>{statusLabel}</Text>
    </Container>
  );
};

const NoticeMessage = ({ code }: { code: SystemNoticeCode }) => (
  <TextElement>{NOTICE_MESSAGES[code]}</TextElement>
);

const ErrorMessage = ({ code }: { code: SystemErrorCode }) => (
  <TextElement color={hexColors.destructive}>
    CODE: {code} An error occured while generating a response. Please try again.
  </TextElement>
);
