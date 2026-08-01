/**
 * Guarda las propuestas ya enriquecidas de la sesión, para que
 * `send_proposal_email` mande exactamente lo que el asesor aprobó en
 * `build_proposal`.
 *
 * Antes, ambas tools recibían la propuesta completa y cada una la volvía a
 * consultar contra KiteProp. Eso tenía dos problemas: el modelo regeneraba
 * cientos de tokens de contenido idéntico, y nada garantizaba que lo enviado
 * fuera lo aprobado (podía cambiar una redacción, perder una opción o alterar
 * un precio entre una llamada y la otra).
 *
 * `defineState` es memoria durable por sesión: sobrevive a los límites de step,
 * a los reinicios y a los redeploys, así que el ID sigue siendo válido aunque
 * pasen horas entre que el asesor revisa y aprueba.
 */

import { defineState } from "eve/context";
import type { EnrichedProposal } from "./proposal";

type ProposalStore = {
  /** Contador incremental: evita depender de aleatoriedad dentro del workflow. */
  nextId: number;
  proposals: Record<string, EnrichedProposal>;
};

const store = defineState<ProposalStore>("kigent.proposals", () => ({
  nextId: 1,
  proposals: {},
}));

/** Guarda la propuesta enriquecida y devuelve el ID con el que se la envía. */
export function saveProposal(proposal: EnrichedProposal): string {
  const { nextId } = store.get();
  const proposalId = `prop-${nextId}`;

  store.update((current) => ({
    nextId: current.nextId + 1,
    proposals: { ...current.proposals, [proposalId]: proposal },
  }));

  return proposalId;
}

/** Recupera una propuesta guardada. Falla con un mensaje que el modelo puede accionar. */
export function loadProposal(proposalId: string): EnrichedProposal {
  const { proposals } = store.get();
  const proposal = proposals[proposalId];

  if (!proposal) {
    const known = Object.keys(proposals);
    throw new Error(
      `No hay ninguna propuesta con el ID "${proposalId}" en esta sesión. ` +
        (known.length > 0
          ? `Las disponibles son: ${known.join(", ")}. `
          : "Todavía no se armó ninguna. ") +
        "Llamá a build_proposal primero y usá el proposalId que devuelve.",
    );
  }

  return proposal;
}
