import { Ref } from "react";
import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import {
  Container,
  ContainerProperties,
  ContainerRef,
} from "@react-three/uikit";

export default function XRCustomContainer({
  children,
  scrollRef,
  gap,
  ...props
}: {
  children: React.ReactNode;
  scrollRef?: Ref<ContainerRef>;
  gap?: number;
} & ContainerProperties) {
  return (
    <Container
      backgroundColor={XR_COLORS.card}
      flexDirection="column"
      padding={XR_STYLES.spacingXl}
      borderRadius={XR_STYLES.radiusLg}
      castShadow
      width={XR_STYLES.containerMd}
      height={500}
      {...props}
    >
      <Container
        width="100%"
        height="100%"
        flexDirection="column"
        gap={gap || XR_STYLES.spacingMd}
        overflow="scroll"
        scrollbarBorderRadius={XR_STYLES.radiusSm}
        paddingRight={XR_STYLES.radiusLg}
        ref={scrollRef}
      >
        {children}
      </Container>
    </Container>
  );
}
