import { useEffect } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import useSpeechRecording from "./use-speech-recording";
import useUsage from "@/features/billing/hooks/use-usage";
import useComposerStore from "@/features/composer/store";

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
  const disabled = usage?.limitHit || processing;

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
      SpeechRecognition.startListening();
    } else {
      setPrompt("__transcribing__");
      startRecording();
    }
  };

  // stop speech, use web speech api when available
  const stopSpeech = () => {
    if (browserSupportsSpeechRecognition) {
      SpeechRecognition.stopListening();
    } else {
      stopRecording();
    }
  };

  // update prompt when transcription has completed
  useEffect(() => {
    // web speech api
    if (transcript.trim().toLowerCase() !== "") {
      setPrompt(transcript);
    }
  }, [transcript, setPrompt]);
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
