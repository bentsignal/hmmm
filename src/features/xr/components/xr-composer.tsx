"use client";

import { Root, Container, Text, Input } from "@react-three/uikit";
import { Button } from "@react-three/uikit-default";
import { Brain, Mic, Send } from "@react-three/uikit-lucide";
import { Handle, HandleTarget } from "@react-three/handle";
import useComposer from "@/features/composer/hooks/use-composer";
import useModelStore from "@/features/models/store";

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

  const { currentModel } = useModelStore();

  const inputValue = isRecording
    ? "Listening..."
    : isTranscribing
      ? "Transcribing..."
      : message
        ? message
        : "How can I help you?";

  const buttonTextColor = "#111726";

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
              alignItems="flex-end"
              justifyContent="space-between"
              borderRadius={20}
              castShadow
            >
              <Container flexDirection="column" gap={16} width={300}>
                <Input
                  value={inputValue}
                  onValueChange={(value) => setMessage(value)}
                  width={300}
                  backgroundColor="#404858"
                  paddingRight={10}
                  multiline
                  color={
                    isTranscribing || isRecording || !message ? "gray" : "white"
                  }
                  disabled
                />
                <Container
                  flexDirection="row"
                  gap={10}
                  alignItems="center"
                  paddingLeft={6}
                >
                  <Brain width={12} height={12} color="white" />
                  <Text color="white" fontSize={12} fontWeight={500}>
                    {currentModel.name}
                  </Text>
                </Container>
              </Container>
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                marginRight={10}
              >
                <Mic
                  width={24}
                  height={24}
                  color={isRecording ? "lightcoral" : buttonTextColor}
                />
              </Button>
              <Button onClick={handleSendMessage} disabled={blockSend}>
                <Send width={24} height={24} color={buttonTextColor} />
              </Button>
            </Container>
          </Root>
        </Handle>
      </HandleTarget>
    </group>
  );
}
