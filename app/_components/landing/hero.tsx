"use client";

import {
  type MotionValue,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import Link from "next/link";
import { type ReactNode, useRef } from "react";
import { ConsoleShell } from "../console-shell";
import { Magnetic } from "./magnetic";
import { PERSONA } from "./persona";
import { LineReveal } from "./reveal";
import { Waveform } from "./waveform";

/** La consulta que el asesor le pasa a Kigent (estilo EXAMPLE_PROMPTS de /app). */
const ADVISOR_QUERY =
  "Sofía busca depto 2 dorm en Rosario Centro, USD 130.000, cochera, balcón, mudanza antes de diciembre.";

/** Perfil que Kigent extrae de la consulta, como líneas de log. */
const EXTRACTIONS = [
  { ts: "00:06", kv: "operacion=compra" },
  { ts: "00:08", kv: "tipo=departamento" },
  { ts: "00:09", kv: "dormitorios=2" },
  { ts: "00:11", kv: "zona=rosario_centro" },
  { ts: "00:13", kv: "presupuesto=130000_usd" },
  { ts: "00:15", kv: "urgencia=alta" },
];

/** Grano sutil: ruido fractal SVG embebido como data-URI (sin assets externos). */
const GRAIN_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E" +
  "%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' " +
  "stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

const BLINK = {
  duration: 1,
  times: [0, 0.5, 0.5, 1] as number[],
  repeat: Number.POSITIVE_INFINITY,
  ease: "linear" as const,
};

/** Segundos → MM:SS acotado a [0, 47] (de consulta a propuesta en <1 min). */
function mmss(totalSeconds: number) {
  const s = Math.max(0, Math.min(47, Math.round(totalSeconds)));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Revela a sus hijos según el progreso de scroll [from, to]. Solo opacity + y. */
function ScrollStep({
  progress,
  from,
  to,
  reduced,
  className,
  children,
}: {
  progress: MotionValue<number>;
  from: number;
  to: number;
  reduced: boolean;
  className?: string;
  children: ReactNode;
}) {
  const opacity = useTransform(progress, [from, to], [0, 1]);
  const y = useTransform(progress, [from, to], [10, 0]);
  if (reduced) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div className={className} style={{ opacity, y }}>
      {children}
    </motion.div>
  );
}

/** Tool-call visible a KiteProp: "buscando…" → "12 resultados ✓" (crossfade por scroll). */
function SearchToolCall({ progress, reduced }: { progress: MotionValue<number>; reduced: boolean }) {
  const searching = useTransform(progress, [0.5, 0.55, 0.6], [0, 1, 0]);
  const done = useTransform(progress, [0.6, 0.66], [0, 1]);
  if (reduced) {
    return (
      <div className="text-[color:var(--kg-dim)]">
        <span className="text-[color:var(--kg-accent)]">kiteprop.search</span> → 12 resultados ✓
      </div>
    );
  }
  return (
    <div className="relative h-5">
      <motion.span
        className="absolute inset-0 text-[color:var(--kg-dim)]"
        style={{ opacity: searching }}
      >
        <span className="text-[color:var(--kg-accent)]">kiteprop.search</span> · buscando…
      </motion.span>
      <motion.span className="absolute inset-0 text-[color:var(--kg-dim)]" style={{ opacity: done }}>
        <span className="text-[color:var(--kg-accent)]">kiteprop.search</span> → 12 resultados{" "}
        <span className="text-[color:var(--kg-accent)]">✓</span>
      </motion.span>
    </div>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduced = !!useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const clock = useTransform(scrollYProgress, (p) => mmss(p * 47));
  const clockBig = useTransform(scrollYProgress, (p) => mmss(p * 47));

  // Afordance de rebobinado: aparece cuando la velocidad de scroll es negativa.
  const vel = useVelocity(scrollYProgress);
  const rewTarget = useTransform(vel, (v): number => (v < -0.02 ? 1 : 0));
  const rewOpacity = useSpring(rewTarget, { stiffness: 260, damping: 30 });

  return (
    <section ref={ref} className={`relative ${reduced ? "" : "h-[150vh] md:h-[260vh]"}`}>
      <div
        className={`${reduced ? "relative" : "sticky top-0"} flex min-h-dvh flex-col justify-center overflow-hidden`}
      >
        {/* Grano + waveform reactiva detrás */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: `url("${GRAIN_SVG}")` }}
        />
        <Waveform />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          {/* Rail de progreso: de consulta a propuesta */}
          {!reduced && (
            <div
              aria-hidden
              className="absolute top-10 bottom-10 left-0 hidden w-px bg-[color:var(--kg-line)] lg:block"
            >
              <motion.div
                className="h-full w-px origin-top bg-[var(--kg-accent)]"
                style={{ scaleY: scrollYProgress }}
              />
            </div>
          )}

          {/* Columna izquierda: editorial */}
          <div className="relative min-w-0">
            {!reduced && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute -top-16 -left-3 hidden font-sans text-[15rem] font-semibold tabular-nums leading-none tracking-tighter text-[color:var(--kg-text)] opacity-[0.05] lg:block"
              >
                {clockBig}
              </motion.span>
            )}

            <p className="relative mb-6 flex items-center gap-2 font-sans text-xs uppercase tracking-[0.25em] text-[color:var(--kg-dim)]">
              <span aria-hidden className="size-2 bg-[var(--kg-accent)]" />
              Kigent · AI Property Match
            </p>

            <h1 className="relative font-sans text-4xl font-semibold leading-[1.05] tracking-tight text-[color:var(--kg-text)] sm:text-6xl lg:text-7xl">
              <LineReveal delay={0.05}>La llamada termina.</LineReveal>
              <LineReveal delay={0.13}>La propuesta</LineReveal>
              <LineReveal className="text-[color:var(--kg-accent)]" delay={0.21}>
                ya está lista.
              </LineReveal>
            </h1>

            <p className="relative mt-6 max-w-md font-sans text-base leading-relaxed text-[color:var(--kg-dim)]">
              El asesor le pasa a Kigent lo que busca {PERSONA.cliente.split(" ")[0]} y, en
              menos de un minuto, recibe un ranking de propiedades de KiteProp y la propuesta
              lista para enviar. Sin notas, sin formularios, sin oportunidades perdidas.
            </p>

            <div className="relative mt-8 flex flex-wrap items-center gap-3">
              <Magnetic>
                <Link
                  className="inline-block border border-[color:var(--kg-accent)] bg-[var(--kg-accent)] px-6 py-3 font-sans text-sm font-semibold text-[var(--kg-ink)] transition-colors hover:bg-transparent hover:text-[color:var(--kg-accent)]"
                  href="/app"
                >
                  Abrir asistente
                </Link>
              </Magnetic>
              <a
                className="border border-[color:var(--kg-line)] px-6 py-3 font-sans text-sm text-[color:var(--kg-text)] transition-colors hover:border-[color:var(--kg-text)]"
                href="#como-funciona"
              >
                Ver la consulta
              </a>
            </div>
          </div>

          {/* Columna derecha: la consola (interfaz real del producto, mono) */}
          <div className="relative min-w-0">
            <ConsoleShell
              bodyClassName="space-y-4 p-5 font-mono text-xs sm:text-sm"
              dotAnimated={!reduced}
              statusExtra={
                <motion.span
                  className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--kg-dim)]"
                  style={{ opacity: reduced ? 0 : rewOpacity }}
                >
                  ⟲ rew
                </motion.span>
              }
              subLeft={`Asesor: ${PERSONA.asesor}`}
              subRight="KiteProp"
              timer={
                <motion.span className="font-mono text-xs tabular-nums text-[color:var(--kg-accent)]">
                  {reduced ? "00:47" : clock}
                </motion.span>
              }
              title="Kigent · asistente"
            >
                {/* Prompt vivo: la consola está lista desde el arranque */}
                <div className="flex items-center gap-2 text-[11px] text-[color:var(--kg-dim)] sm:text-xs">
                  <span className="text-[color:var(--kg-accent)]">&gt;</span>
                  <span>esperando consulta</span>
                  <motion.span
                    animate={reduced ? undefined : { opacity: [1, 1, 0, 0] }}
                    aria-hidden
                    className="inline-block h-[1.05em] w-[0.5ch] bg-[var(--kg-accent)]"
                    transition={BLINK}
                  />
                </div>

                {/* 1. Consulta del asesor */}
                <ScrollStep
                  from={0.05}
                  progress={scrollYProgress}
                  reduced={reduced}
                  to={0.15}
                >
                  <span className="block leading-relaxed text-[color:var(--kg-dim)]">
                    <span className="text-[color:var(--kg-accent)]">&gt;martín:</span>{" "}
                    <span className="text-[color:var(--kg-text)]">{ADVISOR_QUERY}</span>
                  </span>
                </ScrollStep>

                {/* 2. Kigent extrae el perfil */}
                <div className="space-y-1.5 border-t border-[color:var(--kg-line)] pt-3 text-[11px] sm:text-xs">
                  {EXTRACTIONS.map((e, i) => (
                    <ScrollStep
                      from={0.2 + i * 0.045}
                      key={e.kv}
                      progress={scrollYProgress}
                      reduced={reduced}
                      to={0.27 + i * 0.045}
                    >
                      <span className="flex items-center gap-2">
                        <span className="shrink-0 tabular-nums text-[color:var(--kg-dim)]">{e.ts}</span>
                        <span className="shrink-0 text-[color:var(--kg-dim)]">→</span>
                        <span className="min-w-0 flex-1 truncate text-[color:var(--kg-accent)]">{e.kv}</span>
                        <span className="shrink-0 text-[color:var(--kg-accent)]">✓</span>
                      </span>
                    </ScrollStep>
                  ))}
                </div>

                {/* 3. Tool-call visible al CRM */}
                <ScrollStep
                  className="border-t border-[color:var(--kg-line)] pt-3 text-[11px] sm:text-xs"
                  from={0.48}
                  progress={scrollYProgress}
                  reduced={reduced}
                  to={0.52}
                >
                  <SearchToolCall progress={scrollYProgress} reduced={reduced} />
                </ScrollStep>

                {/* 4. Ranking */}
                <ScrollStep
                  className="border-t border-[color:var(--kg-line)] pt-3"
                  from={0.7}
                  progress={scrollYProgress}
                  reduced={reduced}
                  to={0.8}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="bg-[var(--kg-accent)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--kg-ink)]">
                        Match
                      </span>
                      <span className="truncate text-[color:var(--kg-text)]">{PERSONA.match}</span>
                    </span>
                    <span className="shrink-0 font-bold tabular-nums text-[color:var(--kg-accent)]">
                      {PERSONA.compat}
                    </span>
                  </span>
                </ScrollStep>

                {/* 5. Payoff: propuesta enviada */}
                <ScrollStep
                  className="border border-[oklch(0.77_0.15_165_/_0.35)] bg-[oklch(0.77_0.15_165_/_0.07)] p-3"
                  from={0.84}
                  progress={scrollYProgress}
                  reduced={reduced}
                  to={0.94}
                >
                  <span className="block space-y-1">
                    <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-[color:var(--kg-accent)]">
                      Propuesta enviada a {PERSONA.cliente.split(" ")[0]} <span aria-hidden>✓</span>
                    </span>
                    <span className="block text-[11px] text-[color:var(--kg-dim)]">
                      por email · {PERSONA.analizadas} propiedades analizadas
                    </span>
                    <span className="block text-[11px] text-[color:var(--kg-dim)]">
                      de consulta a propuesta:{" "}
                      <span className="tabular-nums text-[color:var(--kg-text)]">00:47</span>
                    </span>
                  </span>
                </ScrollStep>
            </ConsoleShell>

            {/* Indicador de scroll: ver la consulta */}
            {!reduced && (
              <motion.p
                animate={{ opacity: [0.3, 0.8, 0.3], y: [0, 3, 0] }}
                aria-hidden
                className="mt-4 text-center font-sans text-xs uppercase tracking-[0.25em] text-[color:var(--kg-dim)]"
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              >
                ▼ Ver la consulta
              </motion.p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
