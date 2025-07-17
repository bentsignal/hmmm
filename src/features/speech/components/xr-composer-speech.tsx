import { XR_COLORS, XR_STYLES } from "@/styles/xr-styles";
import { Button } from "@react-three/uikit-default";
import { Mic } from "@react-three/uikit-lucide";
import useSpeech from "@/features/speech/hooks/use-speech";

const XRComposerSpeech = () => {
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
      borderRadius={XR_STYLES.radiusMd}
    >
      <Mic
        width={XR_STYLES.textSm}
        height={XR_STYLES.textSm}
        color={inProgress ? "lightcoral" : XR_COLORS.foreground}
      />
    </Button>
  );
};

export { XRComposerSpeech as ComposerSpeech };
