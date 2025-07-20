import { useState } from "react";
import { xrColors, xrStyles } from "@/styles/xr-styles";
import { Container } from "@react-three/uikit";
import { Button } from "@react-three/uikit-default";
import { Maximize2, Minimize2, X } from "@react-three/uikit-lucide";
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
  isMainThread,
}: {
  threadId: string;
  offset?: number;
  isMainThread?: boolean;
}) {
  const { ref } = useXRThreadScroll({ threadId });
  const { messages, loadMore, status } = useMessages({
    threadId,
  });

  const isActiveThread = useThreadStore(
    (state) => state.activeThread && state.activeThread === threadId,
  );
  const setActiveThread = useThreadStore((state) => state.setActiveThread);

  const [expanded, setExpanded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  return (
    <group position={[isMainThread && expanded ? 0.1 : 0, 0.31, offset ?? 0]}>
      <Grabbable>
        <Container
          flexDirection="column"
          gap={xrStyles.spacingMd}
          onHoverChange={(hovering) => setIsHovering(hovering)}
        >
          <ThreadControls
            threadId={threadId}
            expanded={expanded}
            toggleExpanded={() => setExpanded(!expanded)}
            isHovering={isHovering}
            isMainThread={isMainThread}
          />
          <CustomContainer
            key={`${threadId}-${expanded}`}
            alignItems="center"
            justifyContent="flex-start"
            gap={xrStyles.spacing3xl}
            scrollRef={ref}
            backgroundColor={xrColors.card}
            width={expanded ? xrStyles.containerLg : xrStyles.containerMd}
            height={expanded ? xrStyles.container2xl : xrStyles.containerLg}
            borderColor={isActiveThread ? xrColors.primary : xrColors.card}
            borderWidth={2}
            onClick={() => setActiveThread(threadId)}
            positionType="relative"
          >
            {status !== "Exhausted" && status !== "LoadingFirstPage" && (
              <Button
                onClick={() => loadMore(PAGE_SIZE)}
                borderRadius={xrStyles.radiusLg}
              >
                <TextElement color={xrColors.card} textAlign="center">
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
        </Container>
      </Grabbable>
    </group>
  );
}

const ThreadControls = ({
  threadId,
  expanded,
  toggleExpanded,
  isHovering,
  isMainThread,
}: {
  threadId: string;
  expanded: boolean;
  toggleExpanded: () => void;
  isHovering: boolean;
  isMainThread?: boolean;
}) => {
  const removeXrThread = useThreadStore((state) => state.removeXrThread);
  const iconStyles = {
    width: xrStyles.textMd,
    height: xrStyles.textMd,
    color: xrColors.primary,
    padding: xrStyles.spacingSm,
    borderRadius: xrStyles.radiusLg,
    opacity: isHovering ? 1 : 0,
    hover: {
      backgroundColor: xrColors.card,
    },
  };
  return (
    <Container
      alignItems="center"
      justifyContent="flex-end"
      gap={xrStyles.spacingSm}
    >
      {expanded ? (
        <Minimize2 {...iconStyles} onClick={toggleExpanded} />
      ) : (
        <Maximize2 {...iconStyles} onClick={toggleExpanded} />
      )}
      {!isMainThread && (
        <X {...iconStyles} onClick={() => removeXrThread(threadId)} />
      )}
    </Container>
  );
};
