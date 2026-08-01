"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";

const BARS = Array.from({ length: 44 }, (_, i) => i);
const baseHeight = (i: number) => 18 + ((i * 37) % 62);

/**
 * Waveform full-width detrás del hero. En reposo respira suave; la amplitud
 * (scaleY del contenedor) responde a la velocidad de scroll (useVelocity+useSpring).
 * Solo transform. Reduced-motion: estática.
 */
export function Waveform() {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smooth = useSpring(velocity, { stiffness: 90, damping: 24, mass: 0.4 });
  const amp = useTransform(smooth, [-2500, 0, 2500], [2.6, 0.85, 2.6]);

  if (reduced) {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 flex h-40 items-end justify-between gap-[2px] px-6 opacity-[0.08]"
      >
        {BARS.map((i) => (
          <span
            className="flex-1 bg-[var(--kg-accent)]"
            key={i}
            style={{ height: `${baseHeight(i)}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 flex h-40 origin-bottom items-end justify-between gap-[2px] px-6 opacity-[0.09]"
      style={{ scaleY: amp }}
    >
      {BARS.map((i) => (
        <motion.span
          animate={{ scaleY: [0.85, 1.15, 0.85] }}
          className="flex-1 origin-bottom bg-[var(--kg-accent)]"
          key={i}
          style={{ height: `${baseHeight(i)}%` }}
          transition={{
            duration: 2.4 + (i % 5) * 0.2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: (i % 7) * 0.15,
          }}
        />
      ))}
    </motion.div>
  );
}
