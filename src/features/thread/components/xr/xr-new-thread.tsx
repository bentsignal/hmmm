import { XR_STYLES } from "@/styles/xr-styles";
import { Container } from "@react-three/uikit";
import {
  CustomContainer,
  Grabbable,
  TextElement,
  XRHandle,
} from "@/components/xr";

export default function XRNewThread() {
  return (
    <group position={[0, 0.3, 0]}>
      <Grabbable>
        <CustomContainer alignItems="center">
          <Container
            flexDirection="column"
            flexShrink={0}
            width="100%"
            gap={XR_STYLES.spacingMd}
            height="100%"
            justifyContent="center"
            alignItems="center"
          >
            <TextElement
              textAlign="center"
              fontSize={XR_STYLES.textXl}
              fontWeight="bold"
            >
              Welcome back
            </TextElement>
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
