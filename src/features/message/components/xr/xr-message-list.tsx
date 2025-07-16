import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { Handle, HandleTarget } from "@react-three/handle";
import { Container, Root, Text } from "@react-three/uikit";
import { ResponseMessage } from ".";
import useMessages from "../../hooks/use-messages";
import XRHandle from "@/components/xr";

export default function XRMessageList({ threadId }: { threadId: string }) {
  const { messages } = useMessages({
    threadId,
    streaming: true,
  });
  return (
    <group position={[0, 0.3, 0]}>
      <HandleTarget>
        <Handle>
          <Root flexDirection="column" pixelSize={0.001} gap={10}>
            <Container
              backgroundColor={XR_COLORS.card}
              flexDirection="column"
              padding={28}
              alignItems="center"
              justifyContent="flex-start"
              borderRadius={XR_STYLES.radiusLg}
              castShadow
              width={370}
              gap={40}
              height={500}
              overflow="scroll"
              scrollbarBorderRadius={XR_STYLES.radiusXs}
            >
              {messages.map((message) =>
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
              )}
            </Container>
            <XRHandle show={true} />
          </Root>
        </Handle>
      </HandleTarget>
    </group>
  );
}
