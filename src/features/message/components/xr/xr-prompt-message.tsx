import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { Text } from "@react-three/uikit";
import { UIMessage } from "ai";

export default function XRPromptMessage({ message }: { message: UIMessage }) {
  return (
    <Text
      key={message.id}
      color={XR_COLORS.foreground}
      flexShrink={0}
      width="100%"
      maxWidth={XR_STYLES.containerSm}
      marginLeft="auto"
      backgroundColor={XR_COLORS.accent}
      padding={XR_STYLES.spacingLg}
      borderRadius={XR_STYLES.radiusLg}
    >
      {message.content}
    </Text>
  );
}
