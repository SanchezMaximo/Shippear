"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { ConsoleDot } from "./console-shell";
import { PERSONA } from "./landing/persona";

type Block =
  | { type: "text"; text: string }
  | { type: "tool"; label: string; result: string };

type Rendered =
  | { type: "text"; text: string }
  | { type: "tool"; label: string; status: "running" | "done"; result: string };

const FIRST = PERSONA.cliente.split(" ")[0];

// Respuesta simulada, tono de colega (no robótico). Se apaga con DEMO_MODE en agent-chat.
const SCRIPT: Block[] = [
  { type: "text", text: `Listo, escuché toda la charla con ${FIRST}. Te resumo lo que busca:` },
  {
    type: "text",
    text: "• Compra · depto 2 dormitorios · Rosario Centro\n• Hasta USD 130.000 · apto crédito\n• Mudanza antes de diciembre · tienen dos hijos (priorizo colegios y espacios verdes)",
  },
  { type: "tool", label: "kiteprop.search", result: "12 propiedades" },
  {
    type: "text",
    text: `El mejor match es ${PERSONA.match} — ${PERSONA.compat}: balcón, cochera y apto crédito. Le siguen Córdoba 980 (91%) y Rioja 1200 (88%).`,
  },
  { type: "text", text: `Le mandé la propuesta a ${FIRST} por mail ✓ ¿Querés que ajuste algo?` },
];

export function CallDemoResponse() {
  const reduced = useReducedMotion();
  const [rendered, setRendered] = useState<Rendered[]>([]);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    let mounted = true;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const run = async () => {
      for (const block of SCRIPT) {
        if (!mounted) return;
        if (block.type === "text") {
          setRendered((r) => [...r, { type: "text", text: "" }]);
          const full = block.text;
          if (reduced) {
            setRendered((r) => {
              const c = [...r];
              c[c.length - 1] = { type: "text", text: full };
              return c;
            });
          } else {
            for (let i = 1; i <= full.length; i++) {
              if (!mounted) return;
              setRendered((r) => {
                const c = [...r];
                c[c.length - 1] = { type: "text", text: full.slice(0, i) };
                return c;
              });
              await sleep(11);
            }
          }
          await sleep(reduced ? 0 : 320);
        } else {
          setRendered((r) => [
            ...r,
            { type: "tool", label: block.label, status: "running", result: block.result },
          ]);
          await sleep(reduced ? 0 : 1800);
          if (!mounted) return;
          setRendered((r) => {
            const c = [...r];
            c[c.length - 1] = {
              type: "tool",
              label: block.label,
              status: "done",
              result: block.result,
            };
            return c;
          });
          await sleep(reduced ? 0 : 400);
        }
      }
      if (mounted) setPlaying(false);
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [reduced]);

  return (
    <>
      {/* Lo que "recibió" el agente tras la llamada */}
      <div className="flex justify-end">
        <div className="max-w-[85%] border border-[color:var(--kg-line)] bg-[var(--kg-panel)] px-4 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--kg-dim)]">
            Llamada · {PERSONA.cliente}
          </span>
          <p className="mt-1 text-sm text-[color:var(--kg-text)]">
            Terminé una llamada con {FIRST}. Te paso la conversación para que armes el perfil y
            busques en KiteProp.
          </p>
        </div>
      </div>

      {/* Respuesta del agente (simulada) */}
      <div className="space-y-3 text-sm leading-relaxed text-[color:var(--kg-text)]">
        {rendered.map((b, i) => {
          const isLast = i === rendered.length - 1;
          if (b.type === "text") {
            return (
              <p className="whitespace-pre-line" key={i}>
                {b.text}
                {playing && isLast ? (
                  <span className="ml-0.5 inline-block h-[1.05em] w-[0.5ch] translate-y-[0.15em] animate-pulse bg-[var(--kg-accent)]" />
                ) : null}
              </p>
            );
          }
          return (
            <div
              className="flex items-center gap-2 border border-[color:var(--kg-line)] bg-[var(--kg-panel)] px-3 py-2 font-mono text-xs"
              key={i}
            >
              <ConsoleDot animated={b.status === "running"} />
              <span className="text-[color:var(--kg-dim)]">{b.label}</span>
              {b.status === "running" ? (
                <span className="text-[color:var(--kg-dim)]">· buscando…</span>
              ) : (
                <motion.span
                  animate={{ opacity: 1 }}
                  className="text-[color:var(--kg-accent)]"
                  initial={{ opacity: 0 }}
                >
                  → {b.result} ✓
                </motion.span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
