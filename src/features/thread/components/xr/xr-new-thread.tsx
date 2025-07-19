import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { Container } from "@react-three/uikit";
import {
  CustomContainer,
  Grabbable,
  H2,
  TextElement,
  XRHandle,
} from "@/components/xr";
import useThreadStore from "@/features/thread/store";

export default function XRNewThread() {
  const activeThread = useThreadStore((state) => state.activeThread);
  return (
    <group position={[0, 0.3, 0]}>
      <Grabbable>
        <CustomContainer
          alignItems="center"
          borderColor={
            activeThread === null ? XR_COLORS.primary : XR_COLORS.card
          }
          borderWidth={2}
        >
          <Container
            flexDirection="column"
            flexShrink={0}
            width="100%"
            gap={XR_STYLES.spacingMd}
            height="100%"
            justifyContent="center"
            alignItems="center"
          >
            <H2 textAlign="center">Welcome back</H2>
            <TextElement textAlign="center">
              How can I help you today?
            </TextElement>
          </Container>
        </CustomContainer>
        <XRHandle show={true} />
      </Grabbable>
    </group>
  );
}
