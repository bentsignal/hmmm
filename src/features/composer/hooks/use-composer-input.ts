import useComposerStore from "../store";

export default function useComposerInput() {
  const setPrompt = useComposerStore((state) => state.setPrompt);
  // prevent typing while using speech
  const disabled = useComposerStore(
    (state) =>
      state.storeIsRecording ||
      state.storeIsTranscribing ||
      state.storeIsListening,
  );
  // show placeholder value only when not using web speech api
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
  };
}
