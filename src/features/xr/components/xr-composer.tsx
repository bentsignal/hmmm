"use client";

import { Root, Container, Input } from "@react-three/uikit";
import { Button } from "@react-three/uikit-default";
import { Mic, Send } from "@react-three/uikit-lucide";
import { Handle, HandleTarget } from "@react-three/handle";
import useComposer from "@/features/composer/hooks/use-composer";

export default function XRComposer() {
  const {
    handleSendMessage,
    message,
    startRecording,
    stopRecording,
    isRecording,
    isTranscribing,
    blockSend,
    setMessage,
  } = useComposer();

  const inputValue = isTranscribing
    ? "Transcribing..."
    : message
      ? message
      : "How can I help you?";

  return (
    <group position={[0, 1, -0.5]}>
      <HandleTarget>
        <Handle>
          <Root flexDirection="column" pixelSize={0.001}>
            <Handle />
            <Container
              backgroundColor={"#404858"}
              flexDirection="row"
              padding={28}
              alignItems="center"
              justifyContent="space-between"
              borderRadius={20}
              castShadow
            >
              <Input
                value={inputValue}
                onValueChange={(value) => setMessage(value)}
                paddingLeft={28}
                paddingRight={28}
                width={300}
                multiline
                color={message ? "white" : "gray"}
                disabled={isTranscribing}
              />
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                marginRight={10}
              >
                <Mic
                  width={24}
                  height={24}
                  color={isRecording ? "lightcoral" : "black"}
                />
              </Button>
              <Button onClick={handleSendMessage} disabled={blockSend}>
                <Send width={24} height={24} />
              </Button>
            </Container>
          </Root>
        </Handle>
      </HandleTarget>
    </group>
  );
}
