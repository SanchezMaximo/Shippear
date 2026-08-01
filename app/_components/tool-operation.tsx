"use client";

import { motion, useReducedMotion } from "motion/react";
import { ConsoleDot } from "./console-shell";

export type ToolStatus = "running" | "done" | "error";

/**
 * Operación de consola: dot pulsante + barra fina indeterminada mientras corre,
 * ✓ con spring al completar. Mismo look para el tool-call guionado (demo) y el real,
 * así son indistinguibles.
 */
export function ToolOperation({
  label,
  status,
  detail,
  running = "buscando…",
}: {
  label: string;
  status: ToolStatus;
  detail?: string;
  /** Gerundio mientras corre. Cambia según la tool: buscando, armando, enviando. */
  running?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="space-y-1 border border-[color:var(--kg-line)] bg-[var(--kg-panel)] px-3 py-2 font-mono text-xs">
      <div className="flex items-center gap-2">
        <ConsoleDot animated={status === "running"} />
        <span className="text-[color:var(--kg-dim)]">{label}</span>
        {status === "running" ? (
          <span className="text-[color:var(--kg-dim)]">· {running}</span>
        ) : status === "error" ? (
          <span className="text-destructive">· error</span>
        ) : (
          <motion.span
            animate={{ opacity: 1, scale: 1 }}
            className="text-[color:var(--kg-accent)]"
            initial={reduced ? false : { opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 420, damping: 20 }}
          >
            → {detail ?? "listo"} ✓
          </motion.span>
        )}
      </div>
      {status === "running" ? (
        <div className="h-px w-full overflow-hidden bg-[color:var(--kg-line)]">
          <motion.div
            animate={reduced ? undefined : { x: ["-120%", "320%"] }}
            className="h-px w-1/3 bg-[var(--kg-accent)]"
            transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          />
        </div>
      ) : null}
    </div>
  );
}
