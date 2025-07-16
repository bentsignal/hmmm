import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { Handle, HandleTarget } from "@react-three/handle";
import { Container, Root } from "@react-three/uikit";
import XRMessages from "./xr-messages";
import XRNewMessageView from "./xr-new-message-view";
import XRHandle from "@/components/xr";
import useThreadStore from "@/features/thread/store/thread-store";

export default function XRMessageListWrapper() {
  const threadId = useThreadStore((state) => state.activeThread);
  return (
    <group position={[0, 0.3, 0]}>
      <HandleTarget>
        <Handle>
          <Root flexDirection="column" pixelSize={0.001} gap={10}>
            <Container
              backgroundColor={XR_COLORS.card}
              flexDirection="column"
              padding={28}
              alignItems="center"
              justifyContent="flex-start"
              borderRadius={XR_STYLES.radiusLg}
              castShadow
              width={370}
              gap={40}
              height={500}
              overflow="scroll"
              scrollbarBorderRadius={XR_STYLES.radiusXs}
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
