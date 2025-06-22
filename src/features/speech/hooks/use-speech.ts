import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import useSpeechRecording from "./use-speech-recording";
import useComposerStore from "@/features/composer/store";
import { useEffect } from "react";
import { speechCommands } from "../util/speech-commands";

export default function useSpeech() {
  const setCurrentModel = useComposerStore((state) => state.setCurrentModel);
  const setPrompt = useComposerStore((state) => state.setPrompt);

  // listening or recording speech
  const inProgress = useComposerStore(
    (state) => state.storeIsListening || state.storeIsRecording,
  );

  // recording finished, waiting for transcription response from api
  const processing = useComposerStore(
    (state) => state.storeIsTranscribing === true,
  );

  // browser native web speech api
  const {
    transcript,
    listening,
    finalTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

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
  }, [listening, isRecording, isTranscribing]);

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

  // triggered when manual recording of speech has finished
  useEffect(() => {
    if (transcribedAudio?.trim().toLowerCase()) {
      checkForCommand(transcribedAudio);
    }
  }, [transcribedAudio]);

  /*
  
    triggered from web speech api, update prompt text on each
    update. only check for commands once transcription is complete
  
  */
  useEffect(() => {
    if (finalTranscript.trim().toLowerCase() !== "") {
      checkForCommand(finalTranscript);
    }
  }, [finalTranscript]);

  useEffect(() => {
    if (transcript.trim().toLowerCase() !== "") {
      setPrompt(transcript);
    }
  }, [transcript]);

  // parse transcription for voice commands
  const checkForCommand = (prompt: string) => {
    // see if command exists in prompt
    const command = speechCommands.find((value) =>
      prompt.toLowerCase().includes(value.phrase.toLowerCase()),
    );
    if (command) {
      // remove command from prompt
      const phrase = command.phrase.toLowerCase();
      const newMessage = prompt.toLowerCase().replace(phrase, "");
      setPrompt(newMessage);
      // update model selection
      setCurrentModel(command.model);
    } else {
      setPrompt(prompt);
    }
  };

  return {
    startSpeech,
    stopSpeech,
    inProgress,
    processing,
  };
}
