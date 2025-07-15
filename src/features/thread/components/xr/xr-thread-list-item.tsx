import { useState } from "react";
import { XR_COLORS } from "@/styles/xr-colors";
import { Container, Text } from "@react-three/uikit";
import { Brain } from "@react-three/uikit-lucide";
import { ThreadListItemProps } from "../../types";

export default function XRThreadListItem({
  title,
  active,
  status,
  onClick,
}: ThreadListItemProps & { onClick: () => void }) {
  const [isHovering, setIsHovering] = useState(false);
  const backgroundColor = isHovering
    ? XR_COLORS.accent
    : active
      ? XR_COLORS.accent
      : XR_COLORS.card;
  return (
    <Container
      backgroundColor={backgroundColor}
      paddingY={10}
      paddingX={10}
      borderRadius={10}
      castShadow
      alignItems="center"
      gap={10}
      onClick={onClick}
      onPointerOver={() => setIsHovering(true)}
      onPointerOut={() => setIsHovering(false)}
    >
      {(status === "streaming" || status === "waiting") && (
        <Brain width={16} height={16} color={XR_COLORS.foreground} />
      )}
      <Text color={XR_COLORS.foreground}>
        {title === "New Chat" ? "" : title}
      </Text>
    </Container>
  );
}
