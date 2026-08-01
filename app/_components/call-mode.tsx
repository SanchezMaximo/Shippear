"use client";

import { PhoneOff } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConsoleShell } from "./console-shell";
import { PERSONA } from "./landing/persona";
import { friendlySpeechError, getSpeechCtor, type SpeechRecognitionLike } from "./speech";
import { useDictation } from "./use-dictation";

const LEVELS = [0.4, 0.85, 0.55, 1, 0.45, 0.75, 0.6, 0.9, 0.35, 0.7, 0.5, 0.8];

/** Guion de la contraparte (cliente). Cada pausa del asesor dispara la siguiente. */
const CLIENT_SCRIPT = [
  "Busco un dos dormitorios…",
  "Por el centro, hasta 130 mil dólares…",
  "Tenemos dos hijos…",
  "Necesitamos mudarnos antes de diciembre…",
  "Sí, apto crédito nos sirve…",
  "Dale, mandámela por mail.",
];

const SILENCE_MS = 2000;

type Line = { speaker: "asesor" | "cliente"; text: string };

function mmss(total: number) {
  const s = Math.max(0, Math.floor(total));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function CallMode({
  onFinish,
  onClose,
}: {
  onFinish: (transcript: string) => void;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const [seconds, setSeconds] = useState(0);
  // Transcripción del asesor (motor: Scribe primero, Web Speech de fallback).
  const [dictated, setDictated] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [committed, setCommitted] = useState(0);
  const [clientTyping, setClientTyping] = useState(false);
  const [fallbackError, setFallbackError] = useState<string | null>(null);

  const dictation = useDictation(dictated, setDictated);

  const startedRef = useRef(false);
  const fallbackStartedRef = useRef(false);
  const stoppingRef = useRef(false);
  const webRecRef = useRef<SpeechRecognitionLike | null>(null);
  const webBaseRef = useRef("");
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientIdxRef = useRef(0);
  const emittingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const liveTail = dictated.slice(committed).trim();

  // Timer de la llamada
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines, dictated, clientTyping]);

  // Fallback Web Speech si Scribe no arranca (sin ELEVENLABS_API_KEY → 503).
  const startWebSpeech = useCallback(() => {
    const Ctor = getSpeechCtor();
    if (!Ctor) {
      setFallbackError("No hay motor de voz disponible en este navegador.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "es-AR";
    rec.continuous = true;
    rec.interimResults = true;
    webBaseRef.current = dictated;
    rec.onresult = (event) => {
      let full = "";
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0]?.transcript ?? "";
      }
      setDictated(webBaseRef.current + full);
    };
    rec.onerror = (event) => {
      const msg = friendlySpeechError(event.error);
      if (msg) setFallbackError(msg);
    };
    rec.onend = () => {
      if (!stoppingRef.current) {
        try {
          rec.start();
        } catch {
          /* race de reinicio */
        }
      }
    };
    webRecRef.current = rec;
    try {
      rec.start();
    } catch {
      /* ignore */
    }
  }, [dictated]);

  // Arranca Scribe una vez al montar.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    dictation.start();
  }, [dictation]);

  // Si Scribe falló, cae a Web Speech (la demo de voz no puede morir).
  useEffect(() => {
    if (fallbackStartedRef.current) return;
    if (dictation.error && !dictation.isRecording && !dictation.isConnecting) {
      fallbackStartedRef.current = true;
      startWebSpeech();
    }
  }, [dictation.error, dictation.isRecording, dictation.isConnecting, startWebSpeech]);

  // Detección de pausa: al callar el asesor, responde el guion de Sofía.
  const onSilence = useCallback(() => {
    const tail = dictated.slice(committed).trim();
    if (!tail || clientIdxRef.current >= CLIENT_SCRIPT.length || emittingRef.current) return;
    emittingRef.current = true;
    const idx = clientIdxRef.current;
    setLines((prev) => [...prev, { speaker: "asesor", text: tail }]);
    setCommitted(dictated.length);
    setClientTyping(true);
    setTimeout(
      () => {
        setLines((prev) => [...prev, { speaker: "cliente", text: CLIENT_SCRIPT[idx] }]);
        clientIdxRef.current = idx + 1;
        setClientTyping(false);
        emittingRef.current = false;
      },
      reduced ? 200 : 850,
    );
  }, [dictated, committed, reduced]);

  useEffect(() => {
    if (silenceRef.current) clearTimeout(silenceRef.current);
    if (dictated.slice(committed).trim()) {
      silenceRef.current = setTimeout(onSilence, SILENCE_MS);
    }
    return () => {
      if (silenceRef.current) clearTimeout(silenceRef.current);
    };
  }, [dictated, committed, onSilence]);

  const teardown = useCallback(() => {
    stoppingRef.current = true;
    if (silenceRef.current) clearTimeout(silenceRef.current);
    dictation.stop();
    webRecRef.current?.abort();
  }, [dictation]);

  useEffect(() => () => teardown(), [teardown]);

  const finish = useCallback(() => {
    teardown();
    const transcript = [...lines.map((l) => l.text), liveTail]
      .map((t) => t.trim())
      .filter(Boolean)
      .join(" ");
    onFinish(transcript);
  }, [teardown, lines, liveTail, onFinish]);

  const cancel = useCallback(() => {
    teardown();
    onClose();
  }, [teardown, onClose]);

  const empty = lines.length === 0 && !liveTail && !clientTyping && !fallbackError;
  const first = PERSONA.cliente.split(" ")[0].toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(0.145_0_0_/_0.96)] p-4">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <ConsoleShell
          subLeft={`Asesor: ${PERSONA.asesor}`}
          subRight={dictation.isRecording ? "Scribe" : "voz"}
          timer={
            <span className="font-mono text-xs tabular-nums text-[color:var(--kg-accent)]">
              {mmss(seconds)}
            </span>
          }
          title={`Llamada · ${PERSONA.cliente}`}
        >
          {/* Waveform viva */}
          <div
            aria-hidden
            className="flex h-10 items-center gap-[3px] border-b border-[color:var(--kg-line)] px-5"
          >
            {LEVELS.map((v, i) => (
              <motion.span
                animate={reduced ? undefined : { scaleY: [v, 0.18, v] }}
                className="h-5 w-[3px] origin-bottom bg-[var(--kg-accent)]"
                key={i}
                style={{ scaleY: v }}
                transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, delay: i * 0.09, ease: "easeInOut" }}
              />
            ))}
          </div>

          {/* Transcript en vivo */}
          <div
            className="max-h-[42dvh] min-h-[9rem] space-y-1.5 overflow-y-auto p-5 font-mono text-xs sm:text-sm"
            ref={scrollRef}
          >
            {empty ? (
              <p className="text-[color:var(--kg-dim)]">
                {dictation.isConnecting
                  ? "Conectando el micrófono…"
                  : "Escuchando la llamada… hablá con tu cliente en altavoz."}
              </p>
            ) : null}
            {lines.map((line, i) => (
              <p
                className={
                  line.speaker === "cliente"
                    ? "text-[color:var(--kg-text)]"
                    : "text-[color:var(--kg-dim)]"
                }
                key={`${i}-${line.text}`}
              >
                <span className="text-[color:var(--kg-accent)]">
                  &gt;{line.speaker === "cliente" ? first : "asesor"}:
                </span>{" "}
                {line.text}
              </p>
            ))}
            {liveTail ? (
              <p className="text-[color:var(--kg-dim)]">
                <span className="text-[color:var(--kg-accent)]">&gt;asesor:</span> {liveTail}
              </p>
            ) : null}
            {clientTyping ? (
              <p className="flex items-center gap-2 text-[color:var(--kg-dim)]">
                <span className="text-[color:var(--kg-accent)]">&gt;{first}:</span>
                <motion.span
                  animate={reduced ? undefined : { opacity: [1, 1, 0, 0] }}
                  aria-hidden
                  className="inline-block h-[1.05em] w-[0.5ch] bg-[var(--kg-accent)]"
                  transition={{ duration: 1, times: [0, 0.5, 0.5, 1], repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                />
              </p>
            ) : null}
            {fallbackError ? <p className="text-destructive">{fallbackError}</p> : null}
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between gap-3 border-t border-[color:var(--kg-line)] px-5 py-3">
            <button
              className="font-mono text-xs uppercase tracking-wider text-[color:var(--kg-dim)] transition-colors hover:text-[color:var(--kg-text)]"
              onClick={cancel}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="flex items-center gap-2 border border-[color:var(--kg-accent)] bg-[var(--kg-accent)] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-[var(--kg-ink)] transition-colors hover:bg-transparent hover:text-[color:var(--kg-accent)]"
              onClick={finish}
              type="button"
            >
              <PhoneOff className="size-3.5" /> Cortar llamada
            </button>
          </div>
        </ConsoleShell>
      </motion.div>
    </div>
  );
}
