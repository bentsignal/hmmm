"use client";

import { XR_COLORS } from "@/styles/xr-colors";
import { Handle, HandleTarget } from "@react-three/handle";
import { Container, Root } from "@react-three/uikit";
import XRComposerInput from "./xr-composer-input";
import XRComposerSend from "./xr-composer-send";
import XRComposerSpeech from "@/features/speech/components/xr-composer-speech";

export default function XRComposer() {
  return (
    <group position={[0, 1, -0.5]}>
      <HandleTarget>
        <Handle>
          <Root flexDirection="column" pixelSize={0.001} gap={10}>
            <Handle />
            <Container
              backgroundColor={XR_COLORS.card}
              flexDirection="row"
              padding={28}
              alignItems="center"
              justifyContent="space-between"
              borderRadius={20}
              castShadow
              width={370}
              gap={10}
            >
              <XRComposerInput />
              <XRComposerSpeech />
              <XRComposerSend />
            </Container>
          </Root>
        </Handle>
      </HandleTarget>
    </group>
  );
}
