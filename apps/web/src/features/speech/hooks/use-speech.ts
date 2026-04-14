import { useEffect } from "react";

import { useUsage } from "@acme/features/billing";
import { useComposerStore } from "@acme/features/composer";

import { useSpeechRecording } from "./use-speech-recording";

export function useSpeech() {
  const appendPrompt = useComposerStore((state) => state.appendPrompt);

  const inProgress = useComposerStore((state) => state.storeIsRecording);

  // recording finished, waiting for transcription response from api
  const processing = useComposerStore(
    (state) => state.storeIsTranscribing === true,
  );

  // prevent users from starting a new transcription while
  // one is being processed, or after they have hit their limit
  const { usage } = useUsage();
  const disabled = usage?.limitHit ?? processing;

  const {
    transcribedAudio,
    startRecording,
    stopRecording,
    isRecording,
    isTranscribing,
  } = useSpeechRecording();

  // keep store in sync
  const setStoreIsTranscribing = useComposerStore(
    (state) => state.setStoreIsTranscribing,
  );
  const setStoreIsRecording = useComposerStore(
    (state) => state.setStoreIsRecording,
  );
  // eslint-disable-next-line no-restricted-syntax -- Syncs external recording state with the composer store
  useEffect(() => {
    setStoreIsRecording(isRecording);
    setStoreIsTranscribing(isTranscribing);
  }, [
    isRecording,
    isTranscribing,
    setStoreIsRecording,
    setStoreIsTranscribing,
  ]);

  function startSpeech() {
    void startRecording();
  }

  function stopSpeech() {
    stopRecording();
  }

  // append transcription result to the existing prompt
  // eslint-disable-next-line no-restricted-syntax -- Syncs transcription result with the prompt
  useEffect(() => {
    if (transcribedAudio?.trim()) {
      appendPrompt(transcribedAudio);
    }
  }, [transcribedAudio, appendPrompt]);

  return {
    startSpeech,
    stopSpeech,
    inProgress,
    processing,
    disabled,
  };
}
