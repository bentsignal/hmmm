import { ReactNode } from "react";
import { hexColors, xrStyles } from "@/styles";
import { Text, TextProperties } from "@react-three/uikit";
import { extractTextFromChildren } from "@/features/messages/util/message-util";

export const TextElement = ({
  children,
  color = hexColors.foreground,
  ...props
}: {
  children: ReactNode;
} & TextProperties) => (
  <Text color={color} width="100%" flexShrink={0} flexWrap="wrap" {...props}>
    {extractTextFromChildren(children)}
  </Text>
);

const Heading = ({
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
  <Heading size={xrStyles.text2xl} {...props}>
    {children}
  </Heading>
);

export const H2 = ({
  children,
  ...props
}: { children: ReactNode } & TextProperties) => (
  <Heading size={xrStyles.textXl} {...props}>
    {children}
  </Heading>
);

export const H3 = ({
  children,
  ...props
}: { children: ReactNode } & TextProperties) => (
  <Heading size={xrStyles.textMd} {...props}>
    {children}
  </Heading>
);

export const H4 = ({
  children,
  ...props
}: { children: ReactNode } & TextProperties) => (
  <Heading size={xrStyles.textSm} {...props}>
    {children}
  </Heading>
);

export const H5 = ({
  children,
  ...props
}: { children: ReactNode } & TextProperties) => (
  <Heading size={xrStyles.textXs} {...props}>
    {children}
  </Heading>
);

export const H6 = ({
  children,
  ...props
}: { children: ReactNode } & TextProperties) => (
  <Heading size={xrStyles.textXs - 2} {...props}>
    {children}
  </Heading>
);
