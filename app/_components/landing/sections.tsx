"use client";

import {
  ArrowRight,
  AudioLines,
  Check,
  ListChecks,
  Sparkles,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";

const STEPS = [
  {
    icon: AudioLines,
    title: "Escucha",
    body: "Kigent acompaña la llamada (con consentimiento del cliente) y entiende el lenguaje natural: no hace falta completar ningún formulario.",
  },
  {
    icon: ListChecks,
    title: "Estructura",
    body: "Arma el perfil de búsqueda en tiempo real: operación, tipo, zona, presupuesto, dormitorios, urgencia y más de 15 señales del cliente.",
  },
  {
    icon: Sparkles,
    title: "Matchea",
    body: "Cruza el perfil contra tu CRM y devuelve un ranking de propiedades con su porcentaje de compatibilidad, antes de que cortes.",
  },
];

const MATCHES = [
  {
    rank: 1,
    name: "Departamento Pellegrini 1450",
    score: 97,
    pros: ["Dentro del presupuesto", "Balcón", "Cochera", "Apto crédito"],
    cons: [],
  },
  {
    rank: 2,
    name: "Departamento Córdoba 980",
    score: 91,
    pros: ["Excelente ubicación", "Balcón"],
    cons: ["Sin cochera"],
  },
  {
    rank: 3,
    name: "Departamento Rioja 1200",
    score: 88,
    pros: ["Precio menor", "Cochera"],
    cons: ["Sin balcón"],
  },
];

const INFERENCES = [
  {
    quote: "“Tengo dos hijos.”",
    signals: ["Colegios cercanos", "Espacios verdes", "Seguridad", "Mayor superficie"],
  },
  {
    quote: "“Trabajo desde casa.”",
    signals: ["Ambiente extra", "Buena iluminación", "Espacios silenciosos", "Fibra óptica"],
  },
];

const BENEFITS = [
  ["Menos tiempo administrativo", "El asesor vende; Kigent toma nota y carga el CRM."],
  ["Seguimiento consistente", "Cada consulta queda estructurada, no en la memoria de nadie."],
  ["Recomendaciones precisas", "Se terminan las propuestas que no encajan con el cliente."],
  ["Respuesta inmediata", "Del primer llamado a la propuesta en menos de un minuto."],
  ["Mejor uso del CRM", "Tu stock trabaja solo: cada propiedad encuentra a su cliente."],
  ["Onboarding simple", "Un asesor nuevo propone como uno senior desde el día uno."],
] as const;

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      transition={{ delay, duration: 0.6, ease: [0.21, 0.6, 0.35, 1] }}
      viewport={{ once: true, margin: "-80px" }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <Reveal>
      <p className="mb-3 font-mono text-xs uppercase tracking-widest text-emerald-400">{eyebrow}</p>
      <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
        {title}
      </h2>
      {lead ? <p className="mt-4 max-w-2xl text-pretty text-zinc-400">{lead}</p> : null}
    </Reveal>
  );
}

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24" id="como-funciona">
      <SectionHeading
        eyebrow="Cómo funciona"
        lead="Mientras el asesor conversa, Kigent trabaja. Al cortar, la propuesta ya está armada."
        title="De una conversación a una propuesta, sin pasos intermedios"
      />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal delay={i * 0.12} key={step.title}>
            <div className="group h-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 transition hover:border-emerald-400/30">
              <span className="mb-5 flex size-10 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <step.icon className="size-5" />
              </span>
              <p className="mb-1 font-mono text-xs text-zinc-500">0{i + 1}</p>
              <h3 className="mb-2 text-lg font-semibold text-zinc-100">{step.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{step.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Matching() {
  return (
    <section className="border-y border-zinc-800/70 bg-zinc-900/30 py-24" id="matching">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Matching inteligente"
          lead="Kigent consulta tu CRM y explica cada recomendación: qué encaja, qué no, y por qué."
          title="Un ranking que se defiende solo"
        />
        <div className="mt-12 grid gap-4">
          {MATCHES.map((m, i) => (
            <Reveal delay={i * 0.1} key={m.name}>
              <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 font-mono text-sm text-zinc-400">
                    {m.rank}
                  </span>
                  <div>
                    <p className="font-medium text-zinc-100">{m.name}</p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                      {m.pros.map((p) => (
                        <span className="inline-flex items-center gap-1 text-xs text-zinc-400" key={p}>
                          <Check className="size-3 text-emerald-400" /> {p}
                        </span>
                      ))}
                      {m.cons.map((c) => (
                        <span className="inline-flex items-center gap-1 text-xs text-zinc-500" key={c}>
                          <X className="size-3 text-zinc-600" /> {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:w-48">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                      initial={{ width: 0 }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                      viewport={{ once: true }}
                      whileInView={{ width: `${m.score}%` }}
                    />
                  </div>
                  <span className="font-mono text-sm font-semibold text-emerald-300">{m.score}%</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Inferences() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <SectionHeading
        eyebrow="Valor agregado"
        lead="Kigent detecta lo que el cliente no pide como filtro, pero le importa."
        title="Escucha lo que no se dice"
      />
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {INFERENCES.map((inf, i) => (
          <Reveal delay={i * 0.12} key={inf.quote}>
            <div className="h-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
              <p className="mb-5 text-xl font-medium text-zinc-100">{inf.quote}</p>
              <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                Kigent infiere que valora
              </p>
              <div className="flex flex-wrap gap-2">
                {inf.signals.map((s) => (
                  <span
                    className="rounded-md border border-emerald-400/20 bg-emerald-400/[7%] px-2.5 py-1.5 font-mono text-xs text-emerald-200"
                    key={s}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Benefits() {
  return (
    <section className="border-t border-zinc-800/70 py-24" id="beneficios">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="Beneficios"
          title="Más cierres, menos administración"
        />
        <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(([title, body], i) => (
            <Reveal delay={(i % 3) * 0.08} key={title}>
              <div className="border-l border-emerald-400/30 pl-5">
                <h3 className="mb-1.5 font-semibold text-zinc-100">{title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-zinc-800/70 py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50rem 26rem at 50% 120%, oklch(0.55 0.14 165 / 16%), transparent 65%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <h2 className="text-balance text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
            Dejá de tomar notas.
            <br />
            <span className="text-emerald-300">Empezá a vender.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-zinc-400">
            Probá el asistente de Kigent con una consulta real y mirá cómo arma la
            propuesta por vos.
          </p>
          <Link
            className="group mt-9 inline-flex items-center gap-2 rounded-full bg-emerald-400 px-7 py-3.5 text-sm font-medium text-emerald-950 transition hover:bg-emerald-300"
            href="/app"
          >
            Probar el asistente
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link className="text-lg font-semibold tracking-tight text-zinc-50" href="/">
          Kigent<span className="text-emerald-400">.</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-zinc-400 sm:flex">
          <a className="transition hover:text-zinc-100" href="#como-funciona">
            Cómo funciona
          </a>
          <a className="transition hover:text-zinc-100" href="#matching">
            Matching
          </a>
          <a className="transition hover:text-zinc-100" href="#beneficios">
            Beneficios
          </a>
        </nav>
        <Link
          className="rounded-full border border-emerald-400/40 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-400/10"
          href="/app"
        >
          Abrir el asistente
        </Link>
      </div>
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-zinc-800/70 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-zinc-500 sm:flex-row">
        <p>
          Kigent<span className="text-emerald-400">.</span> — AI Property Match
        </p>
        <p className="font-mono text-xs">Hecho en hackatón · {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}
