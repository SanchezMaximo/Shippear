"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { type ReactNode, useRef } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Reveal editorial: la línea sube desde atrás de una máscara (overflow-hidden +
 * translateY 100%→0). Sin efectos de caracteres. Pensado para headlines premium.
 * Reduced-motion: fade simple. startOnView: dispara al entrar al viewport.
 */
export function LineReveal({
  children,
  delay = 0,
  duration = 0.75,
  startOnView = false,
  className,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  startOnView?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  const reduced = useReducedMotion();
  const show = startOnView ? inView : true;

  if (reduced) {
    return (
      <span className={`block ${className ?? ""}`} ref={ref}>
        <motion.span
          animate={show ? { opacity: 1 } : { opacity: 0 }}
          className="block"
          initial={{ opacity: 0 }}
          transition={{ duration: 0.4, delay: delay * 0.5 }}
        >
          {children}
        </motion.span>
      </span>
    );
  }

  return (
    <span className={`block overflow-hidden pb-[0.08em] ${className ?? ""}`} ref={ref}>
      <motion.span
        animate={show ? { y: "0%" } : { y: "110%" }}
        className="block will-change-transform"
        initial={{ y: "110%" }}
        transition={{ duration, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}
