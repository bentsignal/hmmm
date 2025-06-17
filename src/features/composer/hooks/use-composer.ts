import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import useModelStore from "@/features/models/store";
import useThreadMutation from "@/features/thread/hooks/use-thread-mutation";
import useThreadStatus from "@/features/thread/hooks/use-thread-status";
import { toast } from "sonner";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { publicModels } from "@/features/models/types";
import { getSpeechCommands } from "@/features/speech/util/speech-commands";
import useSpeechRecording from "@/features/speech/hooks/use-speech-recording";

export default function useComposer() {
  const pathname = usePathname();
  const router = useRouter();
  const threadId = pathname.split("/").pop() ?? "";

  const [message, setMessage] = useState("");
  const { currentModel, setCurrentModel } = useModelStore();
  const { createThread, newThreadMessage } = useThreadMutation();
  const { isThreadStreaming } = useThreadStatus({ threadId });

  // transcribe audio for XR, where speech recognition api is not available
  const { transcribedAudio, startRecording, stopRecording, isRecording } =
    useSpeechRecording();

  // speech to prompt, includes commands to set model by voice command
  const voiceSetModel = (name: string, prompt: string) => {
    const model = publicModels.find((model) => model.id.includes(name));
    if (model) {
      setCurrentModel(model);
      setMessage(prompt);
    }
  };
  const commands = getSpeechCommands(voiceSetModel);
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition({ commands });

  // added to prevent hydration error with SpeechRecognition
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // update messages when transcript changes
  useEffect(() => {
    if (transcript) {
      setMessage(transcript);
    }
  }, [transcript]);

  // update message when transcribed audio from OpenAI comes in
  useEffect(() => {
    if (transcribedAudio) {
      setMessage(transcribedAudio);
    }
  }, [transcribedAudio]);

  const [optimisticallyBlockSend, setOptimisticallyBlockSend] = useState(false);
  const blockSend =
    isThreadStreaming || optimisticallyBlockSend || message.trim() === "";
  const isLoading = isThreadStreaming || optimisticallyBlockSend;

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

  const handleStartListening = () => {
    SpeechRecognition.startListening();
  };

  const handleStopListening = () => {
    SpeechRecognition.stopListening();
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
  };
}
