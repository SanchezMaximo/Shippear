"use client";

import { MicIcon, SquareIcon } from "lucide-react";
import type { RefObject } from "react";
import { useEffect } from "react";
import {
  PromptInputButton,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useDictation } from "./use-dictation";

type DictationButtonProps = {
  /** Lo llena este componente para que el chat pueda cortar el micrófono al enviar. */
  readonly stopRef: RefObject<(() => void) | null>;
  readonly onError: (message: string | undefined) => void;
};

/**
 * Micrófono del composer. Vive adentro de <PromptInputProvider> porque escribe
 * directo sobre el input controlado mientras el usuario habla.
 */
export function DictationButton({ onError, stopRef }: DictationButtonProps) {
  const { textInput } = usePromptInputController();
  const dictation = useDictation(textInput.value, textInput.setInput);
  const { error, isConnecting, isRecording, stop, toggle } = dictation;

  useEffect(() => {
    stopRef.current = stop;
    return () => {
      stopRef.current = null;
    };
  }, [stop, stopRef]);

  useEffect(() => {
    onError(error);
  }, [error, onError]);

  const label = isRecording ? "Detener el dictado" : "Dictar por voz";

  return (
    <PromptInputButton
      aria-label={label}
      className={cn(
        "absolute right-12 bottom-2.5 rounded-none",
        isRecording &&
          "bg-[oklch(0.77_0.15_165_/_0.15)] text-[color:var(--kg-accent)] hover:bg-[oklch(0.77_0.15_165_/_0.22)]",
      )}
      disabled={isConnecting}
      onClick={toggle}
      tooltip={label}
    >
      {isConnecting ? (
        <Spinner />
      ) : isRecording ? (
        <SquareIcon className="size-4 fill-current" />
      ) : (
        <MicIcon className="size-4" />
      )}
      {isRecording ? <span className="sr-only">Grabando</span> : null}
    </PromptInputButton>
  );
}
