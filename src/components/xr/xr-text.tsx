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
} & TextProperties) => (
  <Text color={color} width="100%" flexShrink={0} flexWrap="wrap" {...props}>
    {extractTextFromChildren(children)}
  </Text>
);

export const Heading = ({
  children,
  size,
  ...props
}: {
  children: ReactNode;
  size: number;
} & TextProperties) => (
  <TextElement fontSize={size} fontWeight="bold" {...props}>
    {children}
  </TextElement>
);

export const H1 = ({
  children,
  ...props
}: { children: ReactNode } & TextProperties) => (
  <Heading size={XR_STYLES.text2xl} {...props}>
    {children}
  </Heading>
);

export const H2 = ({
  children,
  ...props
}: { children: ReactNode } & TextProperties) => (
  <Heading size={XR_STYLES.textXl} {...props}>
    {children}
  </Heading>
);

export const H3 = ({
  children,
  ...props
}: { children: ReactNode } & TextProperties) => (
  <Heading size={XR_STYLES.textMd} {...props}>
    {children}
  </Heading>
);

export const H4 = ({
  children,
  ...props
}: { children: ReactNode } & TextProperties) => (
  <Heading size={XR_STYLES.textSm} {...props}>
    {children}
  </Heading>
);

export const H5 = ({
  children,
  ...props
}: { children: ReactNode } & TextProperties) => (
  <Heading size={XR_STYLES.textXs} {...props}>
    {children}
  </Heading>
);

export const H6 = ({
  children,
  ...props
}: { children: ReactNode } & TextProperties) => (
  <Heading size={XR_STYLES.textXs - 2} {...props}>
    {children}
  </Heading>
);
