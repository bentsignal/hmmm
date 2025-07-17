import { ReactNode } from "react";
import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
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

export const H1 = ({ children }: { children: ReactNode }) => (
  <Heading size={XR_STYLES.text2xl}>{children}</Heading>
);

export const H2 = ({ children }: { children: ReactNode }) => (
  <Heading size={XR_STYLES.textXl}>{children}</Heading>
);

export const H3 = ({ children }: { children: ReactNode }) => (
  <Heading size={XR_STYLES.textMd}>{children}</Heading>
);

export const H4 = ({ children }: { children: ReactNode }) => (
  <Heading size={XR_STYLES.textSm}>{children}</Heading>
);

export const H5 = ({ children }: { children: ReactNode }) => (
  <Heading size={XR_STYLES.textXs}>{children}</Heading>
);

export const H6 = ({ children }: { children: ReactNode }) => (
  <Heading size={XR_STYLES.textXs - 2}>{children}</Heading>
);
