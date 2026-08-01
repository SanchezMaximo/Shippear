"use client";

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useRef } from "react";
import { LineReveal } from "./reveal";

const STATS = [
  { to: 1, prefix: "<", suffix: " min", label: "propuesta lista" },
  { to: 97, prefix: "", suffix: "%", label: "mejor match" },
  { to: 15, prefix: "", suffix: "+", label: "señales por llamada" },
  { to: 0, prefix: "", suffix: "", label: "formularios" },
];

function Counter({ to, prefix, suffix }: { to: number; prefix: string; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const reduced = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${prefix}${Math.round(v)}${suffix}`);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      mv.set(to);
      return;
    }
    const controls = animate(mv, to, { type: "spring", stiffness: 55, damping: 14 });
    return () => controls.stop();
  }, [inView, reduced, to, mv]);

  return (
    <motion.span className="tabular-nums" ref={ref}>
      {text}
    </motion.span>
  );
}

export function Stats() {
  return (
    <section className="border-b border-[color:var(--kg-line)] py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-12 px-6 md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label}>
            <p className="font-sans text-5xl font-semibold tracking-tight text-[color:var(--kg-text)] sm:text-6xl">
              <Counter prefix={s.prefix} suffix={s.suffix} to={s.to} />
            </p>
            <LineReveal
              className="mt-3 font-sans text-sm text-[color:var(--kg-dim)]"
              startOnView
            >
              {s.label}
            </LineReveal>
          </div>
        ))}
      </div>
    </section>
  );
}
