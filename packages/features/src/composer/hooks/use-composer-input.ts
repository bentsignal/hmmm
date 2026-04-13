import { useUsage } from "../../billing/hooks/use-usage";
import { useComposerStore } from "../store/composer-store";

export function useComposerInput() {
  const setPrompt = useComposerStore((state) => state.setPrompt);
  const { usage } = useUsage();

  const disabled = useComposerStore(
    (state) =>
      state.storeIsRecording ||
      state.storeIsTranscribing ||
      state.storeIsListening ||
      usage?.limitHit,
  );

  const placeholder = "Aa";

  const value = useComposerStore((state) =>
    state.storeIsRecording
      ? "Listening..."
      : state.storeIsTranscribing
        ? "Transcribing..."
        : state.prompt === "__transcribing__"
          ? " "
          : state.prompt,
  );

  return {
    value,
    setPrompt,
    disabled,
    placeholder,
  };
}
