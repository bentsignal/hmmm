import { xrColors, xrStyles } from "@/styles/xr-styles";
import { Button } from "@react-three/uikit-default";
import { Mic } from "@react-three/uikit-lucide";
import useSpeech from "@/features/speech/hooks/use-speech";

const XRComposerSpeech = () => {
  const { startSpeech, stopSpeech, inProgress, disabled } = useSpeech();

  return (
    <Button
      onClick={inProgress ? stopSpeech : startSpeech}
      disabled={disabled}
      backgroundColor={xrColors.card}
      size="icon"
      width={40}
      height={32}
      borderColor={xrColors.borderInput}
      borderWidth={0.5}
      borderRadius={xrStyles.radiusMd}
    >
      <Mic
        width={xrStyles.textSm}
        height={xrStyles.textSm}
        color={inProgress ? "lightcoral" : xrColors.foreground}
      />
    </Button>
  );
};

export { XRComposerSpeech as ComposerSpeech };
