import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { Container } from "@react-three/uikit";
import { Button } from "@react-three/uikit-default";
import useThreadStore from "../../store";
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
import useXRThreadScroll from "@/features/thread/hooks/use-xr-thread-scroll";

export default function XRThread({
  threadId,
  offset,
}: {
  threadId: string;
  offset?: number;
}) {
  const { ref } = useXRThreadScroll({ threadId });
  const { messages, loadMore, status } = useMessages({
    threadId,
  });
  const isActiveThread = useThreadStore(
    (state) => state.activeThread && state.activeThread === threadId,
  );
  const setActiveThread = useThreadStore((state) => state.setActiveThread);
  return (
    <group position={[0, 0.3, offset ?? 0]}>
      <Grabbable>
        <CustomContainer
          alignItems="center"
          justifyContent="flex-start"
          gap={XR_STYLES.spacing3xl}
          scrollRef={ref}
          backgroundColor={XR_COLORS.card}
          borderColor={isActiveThread ? XR_COLORS.primary : XR_COLORS.card}
          borderWidth={2}
          onClick={() => setActiveThread(threadId)}
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
          <Container width="100%" height={50} />
        </CustomContainer>
        <XRHandle show={true} />
      </Grabbable>
    </group>
  );
}
