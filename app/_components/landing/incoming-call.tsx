"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { PERSONA } from "./persona";

/**
 * Preloader de primera visita (sessionStorage), ~1s: una LLAMADA ENTRANTE elegante,
 * no un boot técnico. Corte suave al hero. Reduced-motion: más corto y sin pulso.
 */
export function IncomingCall() {
  const reduced = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("kg_call_seen")) return;
    sessionStorage.setItem("kg_call_seen", "1");
    setShow(true);
    const t = setTimeout(() => setShow(false), reduced ? 500 : 1100);
    return () => clearTimeout(t);
  }, [reduced]);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--kg-ink)] px-6"
          exit={{ opacity: 0 }}
          initial={{ opacity: 1 }}
          key="incoming-call"
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 text-center"
            initial={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.span
              animate={reduced ? undefined : { opacity: [0.4, 1, 0.4] }}
              className="block size-2.5 bg-[var(--kg-accent)]"
              transition={{ duration: 1.1, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            />
            <p className="font-sans text-xs uppercase tracking-[0.32em] text-[color:var(--kg-dim)]">
              Llamada entrante
            </p>
            <p className="font-sans text-3xl font-semibold tracking-tight text-[color:var(--kg-text)]">
              {PERSONA.cliente}
            </p>
            <p className="font-sans text-sm tracking-wide text-[color:var(--kg-accent)]">
              ▼ Atender
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
