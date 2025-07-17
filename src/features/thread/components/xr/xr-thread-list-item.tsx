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
      paddingY={XR_STYLES.spacingMd}
      paddingX={XR_STYLES.spacingMd}
      borderRadius={XR_STYLES.radiusMd}
      castShadow
      alignItems="center"
      gap={XR_STYLES.spacingMd}
      onClick={onClick}
      hover={{
        backgroundColor: XR_COLORS.accent,
      }}
    >
      {(status === "streaming" || status === "waiting") && (
        <Brain
          width={XR_STYLES.textMd}
          height={XR_STYLES.textMd}
          color={XR_COLORS.foreground}
        />
      )}
      <Text color={XR_COLORS.foreground}>
        {title === "New Chat" ? "" : title}
      </Text>
    </Container>
  );
}
