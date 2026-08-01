"use client";

import { ArrowRight, Phone } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";

/** Guion de la demo del hero: lo que dice el cliente y lo que Kigent extrae. */
const TRANSCRIPT = [
  { at: 0.8, text: "Estamos buscando un departamento de dos dormitorios…" },
  { at: 2.2, text: "…por el centro de Rosario, hasta 130 mil dólares." },
  { at: 3.6, text: "Necesitamos mudarnos antes de diciembre, se agranda la familia." },
];

const PROFILE_CHIPS = [
  { at: 1.4, label: "Operación", value: "Compra" },
  { at: 1.7, label: "Tipo", value: "Departamento" },
  { at: 2.0, label: "Dormitorios", value: "2" },
  { at: 2.9, label: "Zona", value: "Rosario Centro" },
  { at: 3.2, label: "Presupuesto", value: "USD 130.000" },
  { at: 4.3, label: "Urgencia", value: "Alta · antes de dic." },
];

const WAVE_HEIGHTS = [8, 16, 11, 20, 9, 15, 12, 18, 7, 14, 10, 17];

/** Duración de una vuelta completa de la demo antes de reiniciar el ciclo. */
const CYCLE_MS = 9000;

/** Grano sutil: ruido fractal SVG embebido como data-URI (sin assets externos). */
const GRAIN_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E" +
  "%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' " +
  "stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.55, ease: [0.21, 0.6, 0.35, 1] as const },
  };
}

/** Tarjeta de "llamada en vivo". Se remonta en cada ciclo para reproducir la secuencia. */
function CallDemo() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-2xl shadow-black/40 backdrop-blur">
      {/* Header de llamada */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
            <Phone className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-100">Llamada en curso</p>
            <p className="truncate font-mono text-xs text-zinc-500">02:47 · con consentimiento</p>
          </div>
        </div>
        <div className="flex shrink-0 items-end gap-[3px]" aria-hidden>
          {WAVE_HEIGHTS.map((h, i) => (
            <motion.span
              animate={{ height: [h, h * 0.4, h] }}
              className="w-[3px] rounded-full bg-emerald-400/70"
              initial={{ height: h }}
              key={i}
              transition={{
                duration: 0.9,
                repeat: Number.POSITIVE_INFINITY,
                delay: i * 0.08,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>

      {/* Transcripción */}
      <div className="space-y-3 py-4">
        {TRANSCRIPT.map((line) => (
          <motion.p
            {...fadeUp(line.at)}
            className="max-w-[90%] rounded-xl rounded-tl-sm bg-zinc-800/80 px-4 py-2.5 text-sm leading-relaxed text-zinc-300"
            key={line.text}
          >
            {line.text}
          </motion.p>
        ))}
      </div>

      {/* Perfil extraído */}
      <div className="border-t border-zinc-800 pt-4">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          Perfil detectado en vivo
        </p>
        <div className="flex flex-wrap gap-2">
          {PROFILE_CHIPS.map((chip) => (
            <motion.span
              {...fadeUp(chip.at)}
              className="inline-block rounded-md border border-emerald-400/20 bg-emerald-400/[7%] px-2.5 py-1.5 font-mono text-xs"
              key={chip.label}
            >
              {/* Un solo hijo del motion.span: evita el warning de key de motion (H1). */}
              <span className="inline-flex items-baseline gap-1.5">
                <span className="text-zinc-500">{chip.label}</span>
                <span className="text-emerald-200">{chip.value}</span>
              </span>
            </motion.span>
          ))}
        </div>
      </div>

      {/* Resultado */}
      <motion.div
        {...fadeUp(5.0)}
        className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3"
      >
        <p className="min-w-0 text-sm text-emerald-100">
          <span className="font-semibold">12 propiedades compatibles</span>
          <span className="text-emerald-300/80"> · Top: Pellegrini 1450</span>
        </p>
        <span className="shrink-0 font-mono text-sm font-semibold text-emerald-300">97%</span>
      </motion.div>
    </div>
  );
}

export function Hero() {
  const [cycle, setCycle] = useState(0);

  // Reinicia la demo en loop infinito remontando el bloque animado (cambio de key).
  useEffect(() => {
    const id = setInterval(() => setCycle((c) => c + 1), CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* Glow de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60rem 32rem at 70% -10%, oklch(0.55 0.14 165 / 18%), transparent 60%), radial-gradient(40rem 24rem at 10% 110%, oklch(0.5 0.1 250 / 12%), transparent 60%)",
        }}
      />
      {/* Grano sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: `url("${GRAIN_SVG}")` }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-16 px-6 pt-24 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pt-32 lg:pb-28">
        {/* Columna de texto */}
        <div className="min-w-0">
          <motion.p
            {...fadeUp(0.05)}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3.5 py-1.5 font-mono text-xs tracking-wide text-emerald-300"
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
            </span>
            IA para inmobiliarias
          </motion.p>

          <motion.h1
            {...fadeUp(0.15)}
            className="text-balance text-4xl font-semibold leading-[1.06] tracking-tight text-zinc-50 sm:text-6xl lg:text-7xl"
          >
            La llamada termina.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-200 to-teal-300 bg-clip-text text-transparent">
              La propuesta ya está lista.
            </span>
          </motion.h1>

          <motion.p
            {...fadeUp(0.28)}
            className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-zinc-400"
          >
            Kigent escucha la llamada con tu cliente, arma el perfil de búsqueda en
            tiempo real y cruza tu CRM para devolverte un ranking de propiedades
            compatibles. Sin notas, sin formularios, sin oportunidades perdidas.
          </motion.p>

          <motion.div {...fadeUp(0.4)} className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              className="group inline-flex items-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-sm font-medium text-emerald-950 transition hover:bg-emerald-300"
              href="/app"
            >
              Probar el asistente
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
              href="#como-funciona"
            >
              Ver cómo funciona
            </a>
          </motion.div>
        </div>

        {/* Demo: llamada en vivo (loop infinito) */}
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative min-w-0"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ delay: 0.35, duration: 0.7, ease: [0.21, 0.6, 0.35, 1] }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key={cycle}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              <CallDemo />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
