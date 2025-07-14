import { XR_COLORS } from "@/styles/xr-colors";
import { Button } from "@react-three/uikit-default";
import { Mic } from "@react-three/uikit-lucide";
import useSpeech from "@/features/speech/hooks/use-speech";

export default function XRComposerSpeech() {
  const { startSpeech, stopSpeech, inProgress, disabled } = useSpeech();

  return (
    <Button
      onClick={inProgress ? stopSpeech : startSpeech}
      disabled={disabled}
      backgroundColor={XR_COLORS.card}
      size="icon"
      width={40}
      height={32}
      borderColor={XR_COLORS.borderInput}
      borderWidth={0.5}
    >
      <Mic
        width={16}
        height={16}
        color={inProgress ? "lightcoral" : XR_COLORS.foreground}
      />
    </Button>
  );
}
