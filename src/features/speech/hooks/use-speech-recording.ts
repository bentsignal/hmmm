import { useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../server/transcribe-action";

export default function useSpeechRecording() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [transcribedAudio, setTranscribedAudio] = useState<string | null>(null);

  const startRecording = async () => {
    try {
      // Request microphone access
      const userStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setStream(userStream);

      const mediaRecorder = new MediaRecorder(userStream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const buffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        const transcribedAudio = await transcribeAudio(uint8Array.buffer);
        setTranscribedAudio(transcribedAudio);
        audioChunksRef.current = [];
        setStream(null);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      stream?.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  // Optional: Clean up stream on component unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return {
    startRecording,
    stopRecording,
    isRecording,
    transcribedAudio,
  };
}
