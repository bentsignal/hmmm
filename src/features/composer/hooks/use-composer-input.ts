import useComposerStore from "../store";
import useUsage from "@/features/billing/hooks/use-usage";

export default function useComposerInput() {
  const setPrompt = useComposerStore((state) => state.setPrompt);
  const { usage } = useUsage();

  // prevent typing while using speech
  const disabled = useComposerStore(
    (state) =>
      state.storeIsRecording ||
      state.storeIsTranscribing ||
      state.storeIsListening ||
      usage?.limitHit,
  );

  // show placeholder value only when not using web speech api
  const placeholder = "Aa";

  /** value that will actually be shown in input text box */
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
