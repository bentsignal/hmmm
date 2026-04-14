import { useUsage } from "../../billing/hooks/use-usage";
import { useComposerStore } from "../store/composer-store";

export function useComposerInput() {
  const setPrompt = useComposerStore((state) => state.setPrompt);
  const { usage } = useUsage();

  const disabled = useComposerStore(
    (state) =>
      state.storeIsRecording || state.storeIsTranscribing || usage?.limitHit,
  );

  const placeholder = "Aa";

  const value = useComposerStore((state) => state.prompt);

  return {
    value,
    setPrompt,
    disabled,
    placeholder,
  };
}
