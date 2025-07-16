import { ReactNode } from "react";
import { XR_COLORS } from "@/styles/xr-styles";
import { Text, TextProperties } from "@react-three/uikit";
import { extractTextFromChildren } from "@/features/message/util/message-util";

type FontWeight =
  | "thin"
  | "extra-light"
  | "light"
  | "normal"
  | "medium"
  | "semi-bold"
  | "bold"
  | "extra-bold"
  | "black";

export const TextElement = ({
  children,
  size = 16,
  weight = "normal",
  color = XR_COLORS.foreground,
  ...props
}: {
  children: ReactNode;
  size?: number;
  weight?: FontWeight;
  color?: string;
} & TextProperties) => (
  <Text
    color={color}
    fontSize={size}
    fontWeight={weight}
    width="100%"
    flexShrink={0}
    flexWrap="wrap"
    {...props}
  >
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
  <TextElement size={size} weight="bold">
    {children}
  </TextElement>
);
