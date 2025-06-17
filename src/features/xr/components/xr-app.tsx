"use client";

import { Root, Container, Input } from "@react-three/uikit";
import { Button } from "@react-three/uikit-default";
import { Mic, Send } from "@react-three/uikit-lucide";
import { Handle, HandleTarget } from "@react-three/handle";
import useComposer from "@/features/composer/hooks/use-composer";

export default function XRApp() {
  const {
    handleSendMessage,
    message,
    startRecording,
    stopRecording,
    isRecording,
  } = useComposer();

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
                value={message || "Your message here..."}
                paddingLeft={28}
                paddingRight={28}
                color={message ? "white" : "gray"}
              />
              <Button onClick={handleSendMessage} marginRight={10}>
                <Send width={24} height={24} />
              </Button>
              <Button onClick={isRecording ? stopRecording : startRecording}>
                <Mic
                  width={24}
                  height={24}
                  color={isRecording ? "lightcoral" : "black"}
                />
              </Button>
            </Container>
          </Root>
        </Handle>
      </HandleTarget>
    </group>
  );
}
