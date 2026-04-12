import { useEffect } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

import useUsage from "~/features/billing/hooks/use-usage";
import useComposerStore from "~/features/composer/store";
import useSpeechRecording from "./use-speech-recording";

export default function useSpeech() {
  const setPrompt = useComposerStore((state) => state.setPrompt);
  // listening or recording speech
  const inProgress = useComposerStore(
    (state) => state.storeIsListening || state.storeIsRecording,
  );

  // recording finished, waiting for transcription response from api
  const processing = useComposerStore(
    (state) => state.storeIsTranscribing === true,
  );

  // prevent users from starting a new transcription while
  // one is being processed, or after they have hit their limit
  const { usage } = useUsage();
  const disabled = usage?.limitHit ?? processing;

  // browser native web speech api, preferred when available
  const { transcript, listening, browserSupportsSpeechRecognition } =
    useSpeechRecognition();

  // manually record and transcribe audio when web speech api is unavailable
  const {
    transcribedAudio,
    startRecording,
    stopRecording,
    isRecording,
    isTranscribing,
  } = useSpeechRecording();

  // keep store in sync
  const setStoreIsListening = useComposerStore(
    (state) => state.setStoreIsListening,
  );
  const setStoreIsTranscribing = useComposerStore(
    (state) => state.setStoreIsTranscribing,
  );
  const setStoreIsRecording = useComposerStore(
    (state) => state.setStoreIsRecording,
  );
  // eslint-disable-next-line no-restricted-syntax -- Syncs external speech recognition/recording state with the composer store
  useEffect(() => {
    setStoreIsListening(listening);
    setStoreIsRecording(isRecording);
    setStoreIsTranscribing(isTranscribing);
  }, [
    listening,
    isRecording,
    isTranscribing,
    setStoreIsListening,
    setStoreIsRecording,
    setStoreIsTranscribing,
  ]);

  // start speech, use web speech api when available
  const startSpeech = () => {
    if (browserSupportsSpeechRecognition) {
      void SpeechRecognition.startListening();
    } else {
      setPrompt("__transcribing__");
      void startRecording();
    }
  };

  // stop speech, use web speech api when available
  const stopSpeech = () => {
    if (browserSupportsSpeechRecognition) {
      void SpeechRecognition.stopListening();
    } else {
      stopRecording();
    }
  };

  // update prompt when transcription has completed
  // eslint-disable-next-line no-restricted-syntax -- Syncs web speech API transcript with the prompt
  useEffect(() => {
    // web speech api
    if (transcript.trim().toLowerCase() !== "") {
      setPrompt(transcript);
    }
  }, [transcript, setPrompt]);
  // eslint-disable-next-line no-restricted-syntax -- Syncs manual transcription result with the prompt
  useEffect(() => {
    // manual transcription
    if (transcribedAudio?.trim().toLowerCase()) {
      setPrompt(transcribedAudio);
    }
  }, [transcribedAudio, setPrompt]);

  return {
    startSpeech,
    stopSpeech,
    inProgress,
    processing,
    disabled,
  };
}
