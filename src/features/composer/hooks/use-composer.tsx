import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import useModelStore from "@/features/models/store";
import useThreadMutation from "@/features/thread/hooks/use-thread-mutation";
import useThreadStatus from "@/features/thread/hooks/use-thread-status";
import { Brain } from "lucide-react";
import { toast } from "sonner";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { speechCommands } from "@/features/speech/util/speech-commands";
import useSpeechRecording from "@/features/speech/hooks/use-speech-recording";

export default function useComposer() {
  const pathname = usePathname();
  const router = useRouter();
  const threadId = pathname.split("/").pop() ?? "";

  const [message, setMessage] = useState("");
  const { currentModel, setCurrentModel } = useModelStore();
  const { createThread, newThreadMessage } = useThreadMutation();
  const { isThreadStreaming } = useThreadStatus({ threadId });

  // added to prevent hydration error with SpeechRecognition
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // transcribe audio for XR, where speech recognition api is not available
  const {
    transcribedAudio,
    startRecording,
    stopRecording,
    isRecording,
    isTranscribing,
  } = useSpeechRecording();

  // voice mode, using in browser speech api
  const {
    transcript,
    listening,
    finalTranscript,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  const handleStartListening = () => {
    SpeechRecognition.startListening();
  };

  const handleStopListening = () => {
    SpeechRecognition.stopListening();
  };

  /*

    When transcription is complete, either from speech api or from call
    to open ai, parse the transcribed text and search for commands. If 
    found, update the current model and remove the command from the prompt.

  */
  const checkForCommand = (prompt: string) => {
    // see if command exists in prompt
    const command = speechCommands.find((value) =>
      prompt.toLowerCase().includes(value.phrase.toLowerCase()),
    );
    if (command) {
      // remove command from prompt
      const phrase = command.phrase.toLowerCase();
      const newMessage = prompt.toLowerCase().replace(phrase, "");
      setMessage(newMessage);
      // update model and inform user
      setCurrentModel(command.model);
      toast.message(
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          <span className="text-sm">Using {command.model.name}</span>
        </div>,
      );
    } else {
      setMessage(prompt);
    }
  };

  useEffect(() => {
    if (finalTranscript.trim().toLowerCase() !== "") {
      checkForCommand(finalTranscript);
    }
  }, [finalTranscript]);

  useEffect(() => {
    if (transcript.trim().toLowerCase() !== "") {
      setMessage(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    if (transcribedAudio?.trim().toLowerCase()) {
      checkForCommand(transcribedAudio);
    }
  }, [transcribedAudio]);

  // prevent user from sending message while response is being streamed in
  const [optimisticallyBlockSend, setOptimisticallyBlockSend] = useState(false);
  const blockSend =
    isThreadStreaming ||
    optimisticallyBlockSend ||
    message.trim() === "" ||
    isTranscribing ||
    isRecording;
  const isLoading =
    isThreadStreaming || optimisticallyBlockSend || isTranscribing;

  const handleSendMessage = async () => {
    if (blockSend) {
      return;
    }
    setMessage("");
    setOptimisticallyBlockSend(true);
    setTimeout(() => {
      setOptimisticallyBlockSend(false);
    }, 2000);
    try {
      if (pathname === "/") {
        const threadId = await createThread({
          message: message,
          modelId: currentModel.id,
        });
        router.push(`/chat/${threadId}`);
      } else if (pathname === "/xr") {
        await createThread({
          message: message,
          modelId: currentModel.id,
        });
      } else {
        await newThreadMessage({
          threadId: pathname.split("/")[2],
          prompt: message,
          modelId: currentModel.id,
        });
      }
    } catch (error) {
      console.error(error);
      if ((error as Error).message.includes("User is not subscribed")) {
        toast.error("Error: Access denied.");
      } else {
        toast.error("Error: Failed to generate response. Please try again.");
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return {
    message,
    setMessage,
    handleSendMessage,
    handleKeyPress,
    isLoading,
    blockSend,
    handleStartListening,
    handleStopListening,
    listening,
    resetTranscript,
    speechSupported: isClient && browserSupportsSpeechRecognition,
    transcribedAudio,
    startRecording,
    stopRecording,
    isRecording,
    isTranscribing,
  };
}
