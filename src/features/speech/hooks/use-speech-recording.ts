import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useConvexAuth } from "convex/react";
import { MAX_RECORDING_DURATION } from "../config";
import { transcribeAudio } from "../server/transcribe-action";
import { tryCatch } from "@/lib/utils";

export default function useSpeechRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { isAuthenticated } = useConvexAuth();
  // io & data
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // track duration of recording
  const maxDurationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // transcript returned from server
  const [transcribedAudio, setTranscribedAudio] = useState<string | null>(null);

  const startRecording = async () => {
    setTranscribedAudio(null);

    if (!isAuthenticated) {
      toast.error("Please sign in to use the microphone");
      return;
    }

    // request microphone access
    const { data: userStream, error } = await tryCatch(
      navigator.mediaDevices.getUserMedia({
        audio: true,
      }),
    );
    if (error) {
      toast.error("Failed to access microphone");
      return;
    }

    // init recorder
    setStream(userStream);
    const mediaRecorder = new MediaRecorder(userStream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      setIsTranscribing(true);

      // Clear timers
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      if (maxDurationTimeoutRef.current) {
        clearTimeout(maxDurationTimeoutRef.current);
        maxDurationTimeoutRef.current = null;
      }

      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });

      // validate duration
      const audioDurationSeconds = recordingDuration / 1000;
      if (audioDurationSeconds > MAX_RECORDING_DURATION) {
        toast.error(`Recording exceeds ${MAX_RECORDING_DURATION} second limit`);
        setIsTranscribing(false);
        setRecordingDuration(0);
        audioChunksRef.current = [];
        setStream(null);
        return;
      }

      // send recording to server for transcription
      const buffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      const { data: transcript, error: transcriptionError } = await tryCatch(
        transcribeAudio(uint8Array.buffer),
      );
      if (transcriptionError) {
        console.error(transcriptionError);
        toast.error("Ran into an error while transcribing audio");
      }
      setTranscribedAudio(transcript);

      // reset
      audioChunksRef.current = [];
      setStream(null);
      setIsTranscribing(false);
      setRecordingDuration(0);
    };

    // Start recording
    mediaRecorder.start();
    setIsRecording(true);
    recordingStartTimeRef.current = Date.now();

    // track duration of recording
    durationIntervalRef.current = setInterval(() => {
      if (recordingStartTimeRef.current) {
        const currentDuration = Date.now() - recordingStartTimeRef.current;
        setRecordingDuration(currentDuration);
      }
    }, 100);

    // stop recording after hitting the duration limit
    maxDurationTimeoutRef.current = setTimeout(
      () => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          stopRecording();
        }
      },
      (MAX_RECORDING_DURATION - 1) * 1000,
    );
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stream?.getTracks().forEach((track) => track.stop());
      recordingStartTimeRef.current = null;
      // clear timers
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      if (maxDurationTimeoutRef.current) {
        clearTimeout(maxDurationTimeoutRef.current);
        maxDurationTimeoutRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (maxDurationTimeoutRef.current) {
        clearTimeout(maxDurationTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    startRecording,
    stopRecording,
    isRecording,
    transcribedAudio,
    isTranscribing,
  };
}
