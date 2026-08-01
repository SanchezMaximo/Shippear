"use client";

import { CommitStrategy, useScribe } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Vocabulario que un modelo genérico transcribe mal en boca de un asesor
 * inmobiliario porteño. Scribe los usa como pistas, no como filtro.
 */
const KEYTERMS = [
  "monoambiente",
  "ambientes",
  "expensas",
  "cochera",
  "baulera",
  "apto crédito",
  "apto profesional",
  "a estrenar",
  "contrafrente",
  "Palermo",
  "Villa Crespo",
  "Caballito",
  "Belgrano",
  "Recoleta",
  "Colegiales",
  "Núñez",
  "Tigre",
  "Nordelta",
  "San Isidro",
  "Vicente López",
];

const MICROPHONE = {
  autoGainControl: true,
  echoCancellation: true,
  noiseSuppression: true,
};

export type Dictation = {
  isConnecting: boolean;
  isRecording: boolean;
  error?: string;
  start: () => void;
  stop: () => void;
  toggle: () => void;
};

/**
 * Dictado en vivo sobre un input controlado: los parciales se pintan y se
 * reemplazan a sí mismos hasta que Scribe confirma el segmento.
 */
export function useDictation(value: string, setValue: (text: string) => void): Dictation {
  /** Lo que ya estaba escrito, más todo lo dictado y confirmado. */
  const baseRef = useRef("");
  /** Lo último que escribimos nosotros; si el input difiere, lo tocó el usuario. */
  const writtenRef = useRef("");
  const valueRef = useRef(value);
  const setValueRef = useRef(setValue);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string>();

  useEffect(() => {
    valueRef.current = value;
    setValueRef.current = setValue;
  });

  const write = useCallback((text: string) => {
    writtenRef.current = text;
    setValueRef.current(text);
  }, []);

  /**
   * Si el input cambió por fuera nuestro —el usuario editó a mano, o se envió
   * el mensaje y se limpió— seguimos dictando a partir de lo que hay ahora.
   */
  const rebase = useCallback(() => {
    if (valueRef.current !== writtenRef.current) {
      baseRef.current = valueRef.current;
    }
  }, []);

  const scribe = useScribe({
    // Sin esto Scribe usa `manual` y los segmentos nunca se confirman: el
    // dictado quedaría eternamente en parciales. VAD corta en cada silencio.
    commitStrategy: CommitStrategy.VAD,
    keyterms: KEYTERMS,
    languageCode: "es",
    modelId: "scribe_v2_realtime",
    onCommittedTranscript: ({ text }) => {
      rebase();
      baseRef.current = join(baseRef.current, text);
      write(baseRef.current);
    },
    onPartialTranscript: ({ text }) => {
      rebase();
      write(join(baseRef.current, text));
    },
  });

  const { connect, disconnect, status } = scribe;
  const isRecording = status === "connected" || status === "transcribing";

  const start = useCallback(() => {
    setConnectError(undefined);
    setIsConnecting(true);

    void (async () => {
      try {
        const response = await fetch("/api/scribe-token", { method: "POST" });
        const payload: unknown = await response.json();

        if (!response.ok) {
          throw new Error(errorFromPayload(payload));
        }

        // Anclamos recién acá: entre el click y el token el usuario pudo escribir.
        baseRef.current = valueRef.current;
        writtenRef.current = valueRef.current;

        await connect({ microphone: MICROPHONE, token: tokenFromPayload(payload) });
      } catch (error) {
        setConnectError(toMessage(error));
      } finally {
        setIsConnecting(false);
      }
    })();
  }, [connect]);

  const stop = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const toggle = useCallback(() => {
    if (isRecording) {
      stop();
      return;
    }
    if (!isConnecting) {
      start();
    }
  }, [isRecording, isConnecting, start, stop]);

  return {
    error: connectError ?? scribe.error ?? undefined,
    isConnecting,
    isRecording,
    start,
    stop,
    toggle,
  };
}

/** Pega el dictado al texto previo sin duplicar el espacio del medio. */
function join(base: string, addition: string): string {
  if (base.trim().length === 0) {
    return addition;
  }
  return `${base.replace(/\s+$/, "")} ${addition}`;
}

function tokenFromPayload(payload: unknown): string {
  const token =
    typeof payload === "object" && payload !== null && "token" in payload
      ? (payload as { token: unknown }).token
      : undefined;

  if (typeof token !== "string") {
    throw new Error("El servidor no devolvió un token de dictado válido.");
  }

  return token;
}

function errorFromPayload(payload: unknown): string {
  const error =
    typeof payload === "object" && payload !== null && "error" in payload
      ? (payload as { error: unknown }).error
      : undefined;

  return typeof error === "string" ? error : "No se pudo iniciar el dictado por voz.";
}

function toMessage(error: unknown): string {
  if (error instanceof DOMException) {
    // getUserMedia: el navegador negó el micrófono o no hay ninguno.
    if (error.name === "NotAllowedError") {
      return "No nos diste permiso para usar el micrófono.";
    }
    if (error.name === "NotFoundError") {
      return "No encontramos ningún micrófono conectado.";
    }
  }

  return error instanceof Error ? error.message : "No se pudo iniciar el dictado por voz.";
}
