import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Hero } from "@/app/_components/landing/hero";
import { IncomingCall } from "@/app/_components/landing/incoming-call";
import { Marquee } from "@/app/_components/landing/marquee";
import {
  Benefits,
  FinalCta,
  HowItWorks,
  Inferences,
  LandingFooter,
  LandingNav,
  Matching,
} from "@/app/_components/landing/sections";
import { Stats } from "@/app/_components/landing/stats";

export const metadata: Metadata = {
  title: "Kigent — La IA que escucha la llamada y encuentra la propiedad",
  description:
    "Kigent escucha la llamada con tu cliente, arma el perfil de búsqueda en tiempo real " +
    "y devuelve un ranking de propiedades de KiteProp antes de cortar.",
};

// Paleta de la consola: near-black NEUTRO (zinc) + un único acento emerald.
// Se definen como CSS vars en el wrapper para que nav y hero las usen (cascada).
const theme: CSSProperties = {
  colorScheme: "dark",
  backgroundColor: "var(--kg-ink)",
  color: "var(--kg-text)",
  "--kg-ink": "oklch(0.145 0 0)",
  "--kg-panel": "oklch(0.18 0 0)",
  "--kg-line": "oklch(0.3 0 0)",
  "--kg-text": "oklch(0.89 0 0)",
  "--kg-dim": "oklch(0.62 0 0)",
  "--kg-accent": "oklch(0.77 0.15 165)",
} as CSSProperties;

export default function LandingPage() {
  return (
    <div className="min-h-dvh antialiased" style={theme}>
      <IncomingCall />
      <LandingNav />
      <main>
        <Hero />
        <Marquee />
        <HowItWorks />
        <Matching />
        <Inferences />
        <Stats />
        <Benefits />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
