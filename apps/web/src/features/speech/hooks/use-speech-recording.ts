import { useEffect, useRef, useState } from "react";
import { useConvexAuth } from "convex/react";
import { toast } from "sonner";

import { MAX_RECORDING_DURATION } from "@acme/features/speech";

import { tryCatch } from "~/lib/utils";
import { transcribeAudio } from "../server/transcribe-action";

function clearTimerRefs(
  durationIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>,
  maxDurationTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
) {
  if (durationIntervalRef.current) {
    clearInterval(durationIntervalRef.current);
    durationIntervalRef.current = null;
  }
  if (maxDurationTimeoutRef.current) {
    clearTimeout(maxDurationTimeoutRef.current);
    maxDurationTimeoutRef.current = null;
  }
}

async function processTranscription(options: {
  audioChunksRef: React.MutableRefObject<Blob[]>;
  recordingDuration: number;
  setIsTranscribing: (v: boolean) => void;
  setRecordingDuration: (v: number) => void;
  setStream: (v: MediaStream | null) => void;
  setTranscribedAudio: (v: string | null) => void;
}) {
  const {
    audioChunksRef,
    recordingDuration,
    setIsTranscribing,
    setRecordingDuration,
    setStream,
    setTranscribedAudio,
  } = options;
  setIsTranscribing(true);

  const audioBlob = new Blob(audioChunksRef.current, {
    type: "audio/webm",
  });

  const audioDurationSeconds = recordingDuration / 1000;
  if (audioDurationSeconds > MAX_RECORDING_DURATION) {
    toast.error(`Recording exceeds ${MAX_RECORDING_DURATION} second limit`);
    setIsTranscribing(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];
    setStream(null);
    return;
  }

  const buffer = await audioBlob.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);
  const { data: transcript, error: transcriptionError } = await tryCatch(
    transcribeAudio({ data: uint8Array.buffer }),
  );
  if (transcriptionError) {
    console.error(transcriptionError);
    toast.error("Ran into an error while transcribing audio");
  }
  setTranscribedAudio(transcript ?? null);

  audioChunksRef.current = [];
  setStream(null);
  setIsTranscribing(false);
  setRecordingDuration(0);
}

export function useSpeechRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { isAuthenticated } = useConvexAuth();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const maxDurationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingStartTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [transcribedAudio, setTranscribedAudio] = useState<string | null>(null);

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stream?.getTracks().forEach((track) => track.stop());
      recordingStartTimeRef.current = null;
      clearTimerRefs(durationIntervalRef, maxDurationTimeoutRef);
    }
  };

  const startRecording = async () => {
    setTranscribedAudio(null);

    if (!isAuthenticated) {
      toast.error("Please sign in to use the microphone");
      return;
    }

    let userStream: MediaStream;
    try {
      userStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Failed to access microphone");
      return;
    }

    setStream(userStream);
    const mediaRecorder = new MediaRecorder(userStream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = () => {
      clearTimerRefs(durationIntervalRef, maxDurationTimeoutRef);
      void processTranscription({
        audioChunksRef,
        recordingDuration,
        setIsTranscribing,
        setRecordingDuration,
        setStream,
        setTranscribedAudio,
      });
    };

    mediaRecorder.start();
    setIsRecording(true);
    const startTime = Date.now();
    recordingStartTimeRef.current = startTime;

    durationIntervalRef.current = setInterval(() => {
      if (recordingStartTimeRef.current) {
        const currentDuration = Date.now() - recordingStartTimeRef.current;
        setRecordingDuration(currentDuration);
      }
    }, 100);

    maxDurationTimeoutRef.current = setTimeout(
      () => {
        if (mediaRecorderRef.current?.state === "recording") {
          stopRecording();
        }
      },
      (MAX_RECORDING_DURATION - 1) * 1000,
    );
  };

  // eslint-disable-next-line no-restricted-syntax -- Cleanup effect syncs with MediaStream and timer APIs
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
  }, [stream]);

  return {
    startRecording,
    stopRecording,
    isRecording,
    transcribedAudio,
    isTranscribing,
  };
}
