"use client";

import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

const DOT_BLINK = {
  duration: 1.4,
  times: [0, 0.5, 0.5, 1] as number[],
  repeat: Number.POSITIVE_INFINITY,
  ease: "easeInOut" as const,
};

/** Cuadradito de estado emerald (late si `animated`). */
export function ConsoleDot({ animated = true }: { animated?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      animate={animated && !reduced ? { opacity: [1, 1, 0.3, 0.3] } : undefined}
      aria-hidden
      className="size-2 shrink-0 bg-[var(--kg-accent)]"
      transition={DOT_BLINK}
    />
  );
}

/**
 * Marco de la consola de Kigent: header (dot + título + timer/estado) + subheader
 * (asesor / KiteProp) + cuerpo. Compartido entre el hero de la landing y /app para
 * que la consola se vea idéntica en ambos lados (una sola fuente de estilos).
 */
export function ConsoleShell({
  title,
  subLeft,
  subRight,
  timer,
  statusExtra,
  dotAnimated = true,
  className,
  bodyClassName,
  children,
}: {
  title: ReactNode;
  subLeft?: ReactNode;
  subRight?: ReactNode;
  timer?: ReactNode;
  statusExtra?: ReactNode;
  dotAnimated?: boolean;
  className?: string;
  bodyClassName?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("border border-[color:var(--kg-line)] bg-[var(--kg-panel)]", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-[color:var(--kg-line)] px-5 py-3.5">
        <span className="flex min-w-0 items-center gap-2 font-mono text-xs uppercase tracking-wider text-[color:var(--kg-text)]">
          <ConsoleDot animated={dotAnimated} />
          <span className="truncate">{title}</span>
        </span>
        {statusExtra || timer ? (
          <span className="flex shrink-0 items-center gap-3">
            {statusExtra}
            {timer}
          </span>
        ) : null}
      </div>
      {subLeft || subRight ? (
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--kg-line)] px-5 py-2 font-mono text-[11px] text-[color:var(--kg-dim)]">
          <span className="truncate">{subLeft}</span>
          {subRight ? <span className="shrink-0">{subRight}</span> : null}
        </div>
      ) : null}
      {children ? <div className={bodyClassName}>{children}</div> : null}
    </div>
  );
}
