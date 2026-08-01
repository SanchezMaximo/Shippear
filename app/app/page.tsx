import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { AgentChat } from "@/app/_components/agent-chat";

export const metadata: Metadata = {
  title: "Kigent — Asistente",
  description:
    "Asistente para corredores inmobiliarios: busca propiedades en KiteProp, arma la propuesta " +
    "y se la envía al cliente por email.",
};

// La consola del hero hecha producto: dark zinc fijo + emerald, radios rectos (3px).
// Remapea los tokens shadcn que usa el chat, scopeado a /app (no toca el resto).
const appTheme: CSSProperties = {
  colorScheme: "dark",
  backgroundColor: "oklch(0.145 0 0)",
  "--background": "oklch(0.145 0 0)",
  "--foreground": "oklch(0.89 0 0)",
  "--card": "oklch(0.185 0 0)",
  "--card-foreground": "oklch(0.89 0 0)",
  "--popover": "oklch(0.185 0 0)",
  "--popover-foreground": "oklch(0.89 0 0)",
  "--primary": "oklch(0.77 0.15 165)",
  "--primary-foreground": "oklch(0.145 0 0)",
  "--secondary": "oklch(0.22 0 0)",
  "--secondary-foreground": "oklch(0.89 0 0)",
  "--muted": "oklch(0.22 0 0)",
  "--muted-foreground": "oklch(0.62 0 0)",
  "--accent": "oklch(0.24 0 0)",
  "--accent-foreground": "oklch(0.92 0 0)",
  "--border": "oklch(0.3 0 0)",
  "--input": "oklch(0.3 0 0)",
  "--ring": "oklch(0.77 0.15 165)",
  "--radius": "0.1875rem",
  // Tokens de la consola (paridad con la landing: ConsoleShell / modo llamada)
  "--kg-ink": "oklch(0.145 0 0)",
  "--kg-panel": "oklch(0.185 0 0)",
  "--kg-line": "oklch(0.3 0 0)",
  "--kg-text": "oklch(0.89 0 0)",
  "--kg-dim": "oklch(0.62 0 0)",
  "--kg-accent": "oklch(0.77 0.15 165)",
} as CSSProperties;

export default function Page() {
  return (
    <div className="min-h-dvh bg-background text-foreground" style={appTheme}>
      <AgentChat />
    </div>
  );
}
