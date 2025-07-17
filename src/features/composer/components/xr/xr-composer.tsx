"use client";

import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { Handle, HandleTarget } from "@react-three/handle";
import { Container, Root } from "@react-three/uikit";
import ComposerInput from "./xr-composer-input";
import ComposerSend from "./xr-composer-send";
import XRHandle from "@/components/xr";
import { ComposerSpeech } from "@/features/speech/components/xr-composer-speech";

export default function XRComposer() {
  return (
    <group rotation={[-0.3, 0.3, 0.1]} position={[-0.175, -0.13, 0.2]}>
      <HandleTarget>
        <Handle>
          <Root
            flexDirection="column"
            pixelSize={0.001}
            gap={XR_STYLES.spacingMd}
          >
            <Container
              backgroundColor={XR_COLORS.card}
              flexDirection="row"
              padding={XR_STYLES.spacingXl}
              alignItems="center"
              justifyContent="space-between"
              borderRadius={XR_STYLES.radiusLg}
              castShadow
              width={370}
              gap={XR_STYLES.spacingMd}
            >
              <Container
                maxHeight={200}
                overflow="scroll"
                alignItems="flex-end"
              >
                <ComposerInput />
              </Container>
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
