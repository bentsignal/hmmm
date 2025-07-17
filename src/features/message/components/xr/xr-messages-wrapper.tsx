import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { Handle, HandleTarget } from "@react-three/handle";
import { Container, Root } from "@react-three/uikit";
import XRMessages from "./xr-messages";
import XRNewMessageView from "./xr-new-message-view";
import XRHandle from "@/components/xr";
import useXRMessageListScroll from "@/features/message/hooks/use-xr-message-list-scroll";
import useThreadStore from "@/features/thread/store/thread-store";

export default function XRMessagesWrapper() {
  const threadId = useThreadStore((state) => state.activeThread);
  const { ref } = useXRMessageListScroll({ threadId: threadId || "" });
  return (
    <group position={[0, 0.3, 0]}>
      <HandleTarget>
        <Handle>
          <Root
            flexDirection="column"
            pixelSize={0.001}
            gap={XR_STYLES.spacingMd}
          >
            <Container
              backgroundColor={XR_COLORS.card}
              flexDirection="column"
              padding={28}
              alignItems="center"
              justifyContent="flex-start"
              borderRadius={XR_STYLES.radiusLg}
              castShadow
              width={370}
              gap={XR_STYLES.spacing3xl}
              height={500}
              overflow="scroll"
              scrollbarBorderRadius={XR_STYLES.radiusSm}
              ref={ref}
            >
              {threadId ? (
                <XRMessages threadId={threadId} />
              ) : (
                <XRNewMessageView />
              )}
            </Container>
            <XRHandle show={true} />
          </Root>
        </Handle>
      </HandleTarget>
    </group>
  );
}
