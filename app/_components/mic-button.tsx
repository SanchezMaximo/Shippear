"use client";

import { usePromptInputController } from "@/components/ai-elements/prompt-input";
import { InputGroupButton } from "@/components/ui/input-group";
import { MicIcon, SquareIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { friendlySpeechError, getSpeechCtor, type SpeechRecognitionLike } from "./speech";

export type MicState = { recording: boolean; error: string | null };

/**
 * Dictado corto por voz para el composer. Web Speech API del browser, escribe el
 * transcript en vivo en el textarea vía el controller de PromptInput.
 * Requiere estar dentro de <PromptInputProvider>.
 */
export function MicButton({
  onStateChange,
  disabled,
}: {
  onStateChange?: (state: MicState) => void;
  disabled?: boolean;
}) {
  const { textInput } = usePromptInputController();
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseRef = useRef("");

  useEffect(() => {
    setSupported(getSpeechCtor() !== undefined);
  }, []);

  useEffect(() => {
    onStateChange?.({ recording, error });
  }, [recording, error, onStateChange]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  const start = useCallback(() => {
    const Ctor = getSpeechCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "es-AR";
    rec.continuous = true;
    rec.interimResults = true;
    baseRef.current = textInput.value ? `${textInput.value.trimEnd()} ` : "";

    rec.onresult = (event) => {
      let full = "";
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0]?.transcript ?? "";
      }
      textInput.setInput(baseRef.current + full);
    };
    rec.onerror = (event) => {
      const msg = friendlySpeechError(event.error);
      if (msg) setError(msg);
      setRecording(false);
    };
    rec.onend = () => setRecording(false);

    recognitionRef.current = rec;
    setError(null);
    try {
      rec.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }, [textInput]);

  const toggle = useCallback(() => {
    if (recording) {
      recognitionRef.current?.stop();
    } else {
      start();
    }
  }, [recording, start]);

  if (!supported) return null;

  return (
    <InputGroupButton
      aria-label={recording ? "Detener dictado" : "Dictar por voz"}
      aria-pressed={recording}
      className={recording ? "animate-pulse text-primary" : "text-muted-foreground"}
      disabled={disabled}
      onClick={toggle}
      type="button"
      variant="ghost"
    >
      {recording ? <SquareIcon className="size-4" /> : <MicIcon className="size-4" />}
    </InputGroupButton>
  );
}
