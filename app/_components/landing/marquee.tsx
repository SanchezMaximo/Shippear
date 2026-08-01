"use client";

import { motion, useReducedMotion } from "motion/react";

/** Las 15+ señales que Kigent detecta (inventario del producto como textura). */
const SIGNALS = [
  "operación",
  "tipo",
  "zona",
  "presupuesto",
  "dormitorios",
  "cochera",
  "balcón",
  "patio",
  "terraza",
  "apto crédito",
  "financiación",
  "fecha de compra",
  "motivo",
  "prioridades",
  "restricciones",
  "urgencia",
];

/**
 * Cinta infinita de señales. Actúa de puente entre el hero y la sección siguiente
 * (sin fold negro vacío). Loop seamless duplicando el contenido y animando x.
 */
export function Marquee() {
  const reduced = useReducedMotion();
  const items = [...SIGNALS, ...SIGNALS];

  return (
    <div
      aria-hidden
      className="relative overflow-hidden border-y border-[color:var(--kg-line)] bg-[var(--kg-ink)] py-4"
    >
      <motion.div
        animate={reduced ? undefined : { x: ["0%", "-50%"] }}
        className="flex w-max gap-8 font-sans text-sm uppercase tracking-[0.18em] text-[color:var(--kg-dim)]"
        transition={{ duration: 34, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      >
        {items.map((s, i) => (
          <span className="flex shrink-0 items-center gap-8" key={i}>
            <span>{s}</span>
            <span className="text-[color:var(--kg-accent)]">·</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}
