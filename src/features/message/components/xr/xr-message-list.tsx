import { XR_COLORS } from "@/styles/xr-colors";
import { Handle, HandleTarget } from "@react-three/handle";
import { Container, Root, Text } from "@react-three/uikit";
import useMessages from "../../hooks/use-messages";

export default function XRMessageList({ threadId }: { threadId: string }) {
  const { messages } = useMessages({
    threadId,
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
              borderRadius={20}
              castShadow
              width={370}
              gap={40}
              height={500}
              overflow="scroll"
            >
              {messages.map((message) => (
                <Text
                  key={message.id}
                  color={XR_COLORS.foreground}
                  flexShrink={0}
                  width="100%"
                  backgroundColor={
                    message.role === "user" ? XR_COLORS.accent : XR_COLORS.card
                  }
                  padding={message.role === "user" ? 10 : 0}
                  borderRadius={message.role === "user" ? 10 : 0}
                >
                  {message.content}
                </Text>
              ))}
            </Container>
          </Root>
        </Handle>
      </HandleTarget>
    </group>
  );
}
