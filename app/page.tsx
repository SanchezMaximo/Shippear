import type { Metadata } from "next";
import { Hero } from "@/app/_components/landing/hero";
import {
  Benefits,
  FinalCta,
  HowItWorks,
  Inferences,
  LandingFooter,
  LandingNav,
  Matching,
} from "@/app/_components/landing/sections";

export const metadata: Metadata = {
  title: "Kigent — La IA que escucha la llamada y encuentra la propiedad",
  description:
    "Kigent escucha la llamada con tu cliente, arma el perfil de búsqueda en tiempo real " +
    "y devuelve un ranking de propiedades de tu CRM antes de cortar.",
};

export default function LandingPage() {
  return (
    <div
      className="min-h-dvh bg-zinc-950 text-zinc-50 antialiased"
      style={{ colorScheme: "dark" }}
    >
      <LandingNav />
      <main>
        <Hero />
        <HowItWorks />
        <Matching />
        <Inferences />
        <Benefits />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
