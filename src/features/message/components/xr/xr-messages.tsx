import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { Text } from "@react-three/uikit";
import { ResponseMessage } from ".";
import useMessages from "../../hooks/use-messages";

export default function XRMessages({ threadId }: { threadId: string }) {
  const { messages } = useMessages({
    threadId,
    streaming: true,
  });
  return messages.map((message) =>
    message.role === "user" ? (
      <Text
        key={message.id}
        color={XR_COLORS.foreground}
        flexShrink={0}
        width="100%"
        backgroundColor={XR_COLORS.accent}
        padding={10}
        borderRadius={XR_STYLES.radiusSm}
      >
        {message.content}
      </Text>
    ) : (
      <ResponseMessage key={message.id} message={message} />
    ),
  );
}
