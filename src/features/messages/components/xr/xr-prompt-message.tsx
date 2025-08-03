import { hexColors, xrStyles } from "@/styles";
import { UIMessage } from "@convex-dev/agent/react";
import { Text } from "@react-three/uikit";

export default function XRPromptMessage({ message }: { message: UIMessage }) {
  return (
    <Text
      key={message.id}
      color={hexColors.foreground}
      flexShrink={0}
      width="100%"
      maxWidth={xrStyles.containerSm}
      marginLeft="auto"
      backgroundColor={hexColors.accent}
      padding={xrStyles.spacingLg}
      borderRadius={xrStyles.radiusLg}
    >
      {message.content}
    </Text>
  );
}
