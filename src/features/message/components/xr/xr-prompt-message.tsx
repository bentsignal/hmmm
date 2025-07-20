import { xrColors, xrStyles } from "@/styles/xr-styles";
import { Text } from "@react-three/uikit";
import { UIMessage } from "ai";

export default function XRPromptMessage({ message }: { message: UIMessage }) {
  return (
    <Text
      key={message.id}
      color={xrColors.foreground}
      flexShrink={0}
      width="100%"
      maxWidth={xrStyles.containerSm}
      marginLeft="auto"
      backgroundColor={xrColors.accent}
      padding={xrStyles.spacingLg}
      borderRadius={xrStyles.radiusLg}
    >
      {message.content}
    </Text>
  );
}
