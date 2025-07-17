import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { Container, ContainerProperties } from "@react-three/uikit";

export default function XRCustomContainer({
  children,
  ...props
}: {
  children: React.ReactNode;
} & ContainerProperties) {
  return (
    <Container
      backgroundColor={XR_COLORS.card}
      flexDirection="column"
      padding={XR_STYLES.spacingXl}
      borderRadius={XR_STYLES.radiusLg}
      castShadow
      width={370}
      height={500}
      {...props}
    >
      <Container
        width="100%"
        height="100%"
        flexDirection="column"
        gap={XR_STYLES.spacingMd}
        overflow="scroll"
        scrollbarBorderRadius={XR_STYLES.radiusSm}
        paddingRight={XR_STYLES.radiusLg}
      >
        {children}
      </Container>
    </Container>
  );
}
