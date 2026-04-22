"use client";

import { useState, useRef, useCallback } from "react";

export type RecorderState = "idle" | "recording" | "transcribing" | "done";

export interface UseVoiceRecorderResult {
  state: RecorderState;
  transcript: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function useVoiceRecorder(): UseVoiceRecorderResult {
  const [state, setState] = useState<RecorderState>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setTranscript("");
    setError(null);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setTranscript("");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("mic_denied");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      if (chunksRef.current.length === 0) {
        setState("idle");
        return;
      }

      setState("transcribing");
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];

      try {
        const form = new FormData();
        form.append("audio", blob, "recording.webm");
        const res = await fetch("/api/tools/transcribe", { method: "POST", body: form });
        const data = await res.json();
        if (data.text) {
          setTranscript(data.text);
          setState("done");
        } else {
          setError("transcription_failed");
          setState("idle");
        }
      } catch {
        setError("transcription_failed");
        setState("idle");
      }
    };

    recorder.start();
    setState("recording");
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  return { state, transcript, error, start, stop, reset };
}
