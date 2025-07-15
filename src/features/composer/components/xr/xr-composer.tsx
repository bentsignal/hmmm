"use client";

import { XR_COLORS } from "@/styles/xr-colors";
import { Handle, HandleTarget } from "@react-three/handle";
import { Container, Root } from "@react-three/uikit";
import ComposerInput from "./xr-composer-input";
import ComposerSend from "./xr-composer-send";
import XRHandle from "@/components/xr/xr-handle";
import { ComposerSpeech } from "@/features/speech/components/xr-composer-speech";

export default function XRComposer() {
  return (
    <group rotation={[-0.4, 0, 0]} position={[0, -0.03, 0.05]}>
      <HandleTarget>
        <Handle>
          <Root flexDirection="column" pixelSize={0.001} gap={10}>
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
              <ComposerInput />
              <ComposerSpeech />
              <ComposerSend />
            </Container>
            <XRHandle show={true} />
          </Root>
        </Handle>
      </HandleTarget>
    </group>
  );
}
