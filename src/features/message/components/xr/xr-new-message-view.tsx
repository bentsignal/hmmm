import { XR_STYLES } from "@/styles/xr-styles";
import { Container } from "@react-three/uikit";
import { TextElement } from "@/components/xr";

export default function XRNewMessageView() {
  return (
    <Container
      flexDirection="column"
      flexShrink={0}
      width="100%"
      gap={XR_STYLES.spacingLg}
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
      <TextElement textAlign="center">How can I help you today?</TextElement>
    </Container>
  );
}
