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
  return (
    <Container
      backgroundColor={active ? XR_COLORS.accent : XR_COLORS.card}
      paddingY={10}
      paddingX={10}
      borderRadius={10}
      castShadow
      alignItems="center"
      gap={10}
      onClick={onClick}
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
