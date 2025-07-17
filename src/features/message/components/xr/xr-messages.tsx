import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { Text } from "@react-three/uikit";
import { Button } from "@react-three/uikit-default";
import { ResponseMessage } from ".";
import { PAGE_SIZE } from "../../config";
import useMessages from "../../hooks/use-messages";
import { TextElement } from "@/components/xr";

export default function XRMessages({ threadId }: { threadId: string }) {
  const { messages, loadMore, status } = useMessages({
    threadId,
    streaming: true,
  });
  return (
    <>
      {status !== "Exhausted" && status !== "LoadingFirstPage" && (
        <Button
          onClick={() => loadMore(PAGE_SIZE)}
          borderRadius={XR_STYLES.radiusLg}
        >
          <TextElement color={XR_COLORS.card} textAlign="center">
            Load More
          </TextElement>
        </Button>
      )}
      {messages.map((message) =>
        message.role === "user" ? (
          <Text
            key={message.id}
            color={XR_COLORS.foreground}
            flexShrink={0}
            width="100%"
            backgroundColor={XR_COLORS.accent}
            padding={XR_STYLES.spacingLg}
            borderRadius={XR_STYLES.radiusLg}
          >
            {message.content}
          </Text>
        ) : (
          <ResponseMessage key={message.id} message={message} />
        ),
      )}
    </>
  );
}
