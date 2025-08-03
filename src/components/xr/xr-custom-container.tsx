import { Ref } from "react";
import { hexColors, xrStyles } from "@/styles";
import {
  Container,
  ContainerProperties,
  ContainerRef,
} from "@react-three/uikit";

export default function XRCustomContainer({
  children,
  scrollRef,
  gap,
  header,
  ...props
}: {
  children: React.ReactNode;
  scrollRef?: Ref<ContainerRef>;
  gap?: number;
  header?: React.ReactNode;
} & ContainerProperties) {
  return (
    <Container
      backgroundColor={hexColors.card}
      flexDirection="column"
      padding={xrStyles.spacingXl}
      borderRadius={xrStyles.radiusLg}
      castShadow
      width={xrStyles.containerMd}
      height={500}
      gap={header ? xrStyles.spacingLg : 0}
      {...props}
    >
      {header}
      <Container
        width="100%"
        flexDirection="column"
        gap={gap || xrStyles.spacingMd}
        overflow="scroll"
        scrollbarBorderRadius={xrStyles.radiusSm}
        paddingRight={xrStyles.radiusLg}
        ref={scrollRef}
      >
        {children}
      </Container>
    </Container>
  );
}
