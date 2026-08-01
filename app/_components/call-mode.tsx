"use client";

import { motion, useReducedMotion } from "motion/react";
import { PhoneOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConsoleShell } from "./console-shell";
import { PERSONA } from "./landing/persona";
import { friendlySpeechError, getSpeechCtor, type SpeechRecognitionLike } from "./speech";

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
  const [lines, setLines] = useState<Line[]>([]);
  const [interim, setInterim] = useState("");
  const [clientTyping, setClientTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const linesRef = useRef<Line[]>([]);
  const interimRef = useRef("");
  const stoppingRef = useRef(false);
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scriptIdxRef = useRef(0);
  const advisorSinceClientRef = useRef(false);
  const emittingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const pushLine = useCallback((line: Line) => {
    linesRef.current = [...linesRef.current, line];
    setLines(linesRef.current);
  }, []);

  const emitClientLine = useCallback(() => {
    if (emittingRef.current) return;
    if (scriptIdxRef.current >= CLIENT_SCRIPT.length) return;
    if (!advisorSinceClientRef.current) return;
    emittingRef.current = true;
    setClientTyping(true);
    const idx = scriptIdxRef.current;
    setTimeout(
      () => {
        setClientTyping(false);
        pushLine({ speaker: "cliente", text: CLIENT_SCRIPT[idx] });
        scriptIdxRef.current = idx + 1;
        advisorSinceClientRef.current = false;
        emittingRef.current = false;
      },
      reduced ? 200 : 850,
    );
  }, [pushLine, reduced]);

  const armSilence = useCallback(() => {
    if (silenceRef.current) clearTimeout(silenceRef.current);
    silenceRef.current = setTimeout(emitClientLine, SILENCE_MS);
  }, [emitClientLine]);

  // Timer
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll del transcript
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines, interim, clientTyping]);

  // Reconocimiento de voz
  useEffect(() => {
    const Ctor = getSpeechCtor();
    if (!Ctor) {
      setError("Tu navegador no soporta reconocimiento de voz.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "es-AR";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const txt = res[0]?.transcript ?? "";
        if (res.isFinal) {
          const clean = txt.trim();
          if (clean) {
            linesRef.current = [...linesRef.current, { speaker: "asesor", text: clean }];
            setLines(linesRef.current);
            advisorSinceClientRef.current = true;
          }
        } else {
          interimText += txt;
        }
      }
      interimRef.current = interimText;
      setInterim(interimText);
      armSilence();
    };
    rec.onerror = (event) => {
      const msg = friendlySpeechError(event.error);
      if (msg) setError(msg);
    };
    rec.onend = () => {
      if (!stoppingRef.current) {
        try {
          rec.start();
        } catch {
          /* ignore restart race */
        }
      }
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      /* ignore */
    }
    return () => {
      stoppingRef.current = true;
      if (silenceRef.current) clearTimeout(silenceRef.current);
      rec.abort();
    };
  }, [armSilence]);

  const buildTranscript = useCallback(() => {
    return [...linesRef.current.map((l) => l.text), interimRef.current]
      .map((t) => t.trim())
      .filter(Boolean)
      .join(" ");
  }, []);

  const finish = useCallback(() => {
    stoppingRef.current = true;
    if (silenceRef.current) clearTimeout(silenceRef.current);
    recRef.current?.stop();
    onFinish(buildTranscript());
  }, [buildTranscript, onFinish]);

  const cancel = useCallback(() => {
    stoppingRef.current = true;
    if (silenceRef.current) clearTimeout(silenceRef.current);
    recRef.current?.abort();
    onClose();
  }, [onClose]);

  const empty = lines.length === 0 && !interim && !clientTyping && !error;

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
          subRight="KiteProp"
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
                Escuchando la llamada… hablá con tu cliente en altavoz.
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
                  &gt;{line.speaker === "cliente" ? PERSONA.cliente.split(" ")[0].toLowerCase() : "asesor"}:
                </span>{" "}
                {line.text}
              </p>
            ))}
            {interim ? (
              <p className="text-[color:var(--kg-dim)]/70">
                <span className="text-[color:var(--kg-accent)]">&gt;asesor:</span> {interim}
              </p>
            ) : null}
            {clientTyping ? (
              <p className="flex items-center gap-2 text-[color:var(--kg-dim)]">
                <span className="text-[color:var(--kg-accent)]">
                  &gt;{PERSONA.cliente.split(" ")[0].toLowerCase()}:
                </span>
                <motion.span
                  animate={reduced ? undefined : { opacity: [1, 1, 0, 0] }}
                  aria-hidden
                  className="inline-block h-[1.05em] w-[0.5ch] bg-[var(--kg-accent)]"
                  transition={{ duration: 1, times: [0, 0.5, 0.5, 1], repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                />
              </p>
            ) : null}
            {error ? <p className="text-destructive">{error}</p> : null}
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
