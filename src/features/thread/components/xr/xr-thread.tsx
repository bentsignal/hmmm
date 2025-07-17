import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { Button } from "@react-three/uikit-default";
import {
  CustomContainer,
  Grabbable,
  TextElement,
  XRHandle,
} from "@/components/xr";
import {
  PromptMessage,
  ResponseMessage,
  StreamingMessages,
} from "@/features/message/components/xr";
import { PAGE_SIZE } from "@/features/message/config";
import useMessages from "@/features/message/hooks/use-messages";
import useXRMessageListScroll from "@/features/message/hooks/use-xr-message-list-scroll";

export default function XRThread({ threadId }: { threadId: string }) {
  const { ref } = useXRMessageListScroll({ threadId });
  const { messages, loadMore, status } = useMessages({
    threadId,
  });
  return (
    <group position={[0, 0.3, 0]}>
      <Grabbable>
        <CustomContainer
          alignItems="center"
          justifyContent="flex-start"
          gap={XR_STYLES.spacing3xl}
          scrollRef={ref}
        >
          {status !== "Exhausted" && status !== "LoadingFirstPage" && (
            <Button
              onClick={() => loadMore(PAGE_SIZE)}
              borderRadius={XR_STYLES.radiusLg}
            >
              <TextElement color={XR_COLORS.card} textAlign="center">
                Load More
              </TextElement>
            </Button>
          )}
          {messages.map((message) =>
            message.role === "user" ? (
              <PromptMessage key={message.id} message={message} />
            ) : (
              <ResponseMessage key={message.id} message={message} />
            ),
          )}
          <StreamingMessages threadId={threadId} messages={messages} />
        </CustomContainer>
        <XRHandle show={true} />
      </Grabbable>
    </group>
  );
}
