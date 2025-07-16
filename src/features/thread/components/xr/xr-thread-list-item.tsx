import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { Container, Text } from "@react-three/uikit";
import { Brain } from "@react-three/uikit-lucide";
import { ThreadListItemProps } from "../../types";

export default function XRThreadListItem({
  title,
  status,
  onClick,
}: ThreadListItemProps & { onClick: () => void }) {
  return (
    <Container
      backgroundColor={XR_COLORS.card}
      paddingY={10}
      paddingX={10}
      borderRadius={XR_STYLES.radiusSm}
      castShadow
      alignItems="center"
      gap={10}
      onClick={onClick}
      hover={{
        backgroundColor: XR_COLORS.accent,
      }}
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
