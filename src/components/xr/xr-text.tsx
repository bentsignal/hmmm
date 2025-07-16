import { ReactNode } from "react";
import { XR_COLORS } from "@/styles/xr-styles";
import { Text, TextProperties } from "@react-three/uikit";
import { extractTextFromChildren } from "@/features/message/util/message-util";

export const TextElement = ({
  children,
  color = XR_COLORS.foreground,
  ...props
}: {
  children: ReactNode;
  color?: string;
} & TextProperties) => (
  <Text color={color} width="100%" flexShrink={0} flexWrap="wrap" {...props}>
    {extractTextFromChildren(children)}
  </Text>
);

export const Heading = ({
  children,
  size,
}: {
  children: ReactNode;
  size: number;
}) => (
  <TextElement fontSize={size} fontWeight="bold">
    {children}
  </TextElement>
);
