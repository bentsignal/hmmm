"use client";

import { Root, Container, Input } from "@react-three/uikit";
import { Button } from "@react-three/uikit-default";
import {
  Brain,
  Mic,
  Send,
  Globe,
  MessagesSquare,
} from "@react-three/uikit-lucide";
import { Handle, HandleTarget } from "@react-three/handle";
import useComposer from "@/features/composer/hooks/use-composer";
// import useModelStore from "@/features/models/store";
import { useEffect } from "react";

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
    useSearch,
    setUseSearch,
  } = useComposer();

  // const { currentModel } = useModelStore();

  const placeholder = "How can I help you?";

  useEffect(() => {
    if (isTranscribing) {
      setMessage("Transcribing...");
    }
  }, [isTranscribing]);

  useEffect(() => {
    if (isRecording) {
      setMessage("Listening...");
    }
  }, [isRecording]);

  const buttonTextColor = "#372835";
  const cardColor = "#2A1C28";

  return (
    <group position={[0, 1, -0.5]}>
      <HandleTarget>
        <Handle>
          <Root flexDirection="column" pixelSize={0.001} gap={10}>
            <Handle />
            <Container
              backgroundColor={cardColor}
              flexDirection="row"
              padding={28}
              alignItems="flex-end"
              justifyContent="space-between"
              borderRadius={20}
              castShadow
              width={370}
            >
              <Input
                value={message || placeholder}
                onValueChange={(value) => {
                  setMessage(value);
                }}
                width={"100%"}
                multiline
                color={
                  isTranscribing ||
                  isRecording ||
                  !message ||
                  message === placeholder
                    ? "gray"
                    : "white"
                }
                onFocusChange={(focus) => {
                  if (focus && message === placeholder) {
                    setMessage("");
                  } else if (!focus && message === "") {
                    setMessage(placeholder);
                  }
                }}
                disabled={isRecording || isTranscribing}
              />
            </Container>
            <Container
              backgroundColor={cardColor}
              flexDirection="row"
              alignItems="center"
              justifyContent="center"
              borderRadius={20}
              gap={10}
              castShadow
              width={370}
              padding={16}
            >
              <Button>
                <MessagesSquare
                  width={24}
                  height={24}
                  color={buttonTextColor}
                />
              </Button>
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
              >
                <Mic
                  width={24}
                  height={24}
                  color={isRecording ? "lightcoral" : buttonTextColor}
                />
              </Button>
              <Button onClick={() => setUseSearch(!useSearch)}>
                <Globe
                  width={24}
                  height={24}
                  color={useSearch ? "cornflowerblue" : buttonTextColor}
                />
              </Button>
              <Button>
                <Brain width={24} height={24} color={buttonTextColor} />
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={blockSend || message === placeholder}
              >
                <Send width={24} height={24} color={buttonTextColor} />
              </Button>
            </Container>
          </Root>
        </Handle>
      </HandleTarget>
    </group>
  );
}
