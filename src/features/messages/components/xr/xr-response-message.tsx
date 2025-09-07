import { hexColors, xrStyles } from "@/styles";
import { Container, Text } from "@react-three/uikit";
import {
  Brain,
  Clock,
  // Code,
  File,
  Globe,
  Newspaper,
  Sun,
} from "@react-three/uikit-lucide";
import { NOTICE_MESSAGES } from "../../data/notice-messages";
import { MyUIMessage } from "../../types";
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

export default function XRResponseMessage({
  message,
}: {
  message: MyUIMessage;
}) {
  // error occured during repsonse generation, inform user
  const errorCode = isErrorMessage(message.text);
  if (errorCode) {
    return <ErrorMessage code={errorCode} />;
  }

  // notices from server, currently just that you need premium for web results
  const noticeCode = isNoticeMessage(message.text);
  if (noticeCode) {
    return <NoticeMessage code={noticeCode} />;
  }

  return (
    <Container
      flexDirection="column"
      gap={xrStyles.spacingLg}
      flexShrink={0}
      flexWrap="wrap"
    >
      <MessageStatus message={message} />
      <XRMarkdown content={message.text} />
    </Container>
  );
}

const iconStyles = {
  width: xrStyles.textMd,
  height: xrStyles.textMd,
  color: hexColors.foreground,
};

const MessageStatus = ({ message }: { message: MyUIMessage }) => {
  const statusLabel = getStatusLabel(message.parts);

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
      ) : statusLabel === "Analyzing files" ? (
        <File {...iconStyles} />
      ) : (
        // ) : statusLabel === "Generating code" ? (
        //   <Code {...iconStyles} />
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
