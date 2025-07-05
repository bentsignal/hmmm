import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import useSpeechRecording from "./use-speech-recording";
import useComposerStore from "@/features/composer/store";
import { useEffect } from "react";
import useUsage from "@/features/billing/hooks/use-usage";

export default function useSpeech() {
  // listening or recording speech
  const inProgress = useComposerStore(
    (state) => state.storeIsListening || state.storeIsRecording,
  );
  const setPrompt = useComposerStore((state) => state.setPrompt);

  // recording finished, waiting for transcription response from api
  const processing = useComposerStore(
    (state) => state.storeIsTranscribing === true,
  );

  // user usage limits
  const { usage } = useUsage();
  const disabled = usage?.limitHit || processing;

  // browser native web speech api
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

  useEffect(() => {
    if (transcript.trim().toLowerCase() !== "") {
      setPrompt(transcript);
    }
  }, [transcript, setPrompt]);

  useEffect(() => {
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
