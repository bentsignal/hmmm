"use client";

import { hexColors, xrStyles } from "@/styles";
import { Container } from "@react-three/uikit";
import ComposerInput from "./xr-composer-input";
import ComposerSend from "./xr-composer-send";
import { Grabbable, XRHandle } from "@/components/xr";

// import { ComposerSpeech } from "@/features/speech/components/xr-composer-speech";

export default function XRComposer() {
  return (
    <group rotation={[-0.3, 0.3, 0.1]} position={[-0.175, -0.13, 0.2]}>
      <Grabbable>
        <Container
          backgroundColor={hexColors.card}
          flexDirection="row"
          padding={xrStyles.spacingXl}
          alignItems="center"
          justifyContent="space-between"
          borderRadius={xrStyles.radiusLg}
          castShadow
          width={xrStyles.containerLg}
          gap={xrStyles.spacingMd}
        >
          <Container maxHeight={200} overflow="scroll" alignItems="flex-end">
            <ComposerInput />
          </Container>
          {/* <ComposerSpeech /> */}
          <ComposerSend />
        </Container>
        <XRHandle show={true} />
      </Grabbable>
    </group>
  );
}
