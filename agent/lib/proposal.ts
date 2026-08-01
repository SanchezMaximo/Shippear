/**
 * Esquema compartido de la propuesta que Kigent arma para un cliente y las
 * funciones que la enriquecen con datos frescos de KiteProp.
 */

import { z } from "zod";
import {
  describeLocation,
  describeSpecs,
  formatPrice,
  getProperty,
  type Property,
} from "./kiteprop";

export const proposalSelectionSchema = z.object({
  propertyId: z.string().min(1).describe("ID de la propiedad en KiteProp."),
  whyItFits: z
    .string()
    .min(1)
    .describe("Por qué esta propiedad encaja con lo que pidió el cliente. 1-3 oraciones."),
  caveat: z
    .string()
    .optional()
    .describe("Punto a tener en cuenta, si lo hay (ej. 'sin cochera', 'requiere refacción')."),
});

export const proposalSchema = z.object({
  clientName: z.string().min(1).describe("Nombre del cliente al que va dirigida la propuesta."),
  advisorName: z.string().min(1).describe("Nombre del corredor o asesor que atendió al cliente."),
  advisorContact: z
    .string()
    .optional()
    .describe("Teléfono y/o email del asesor para el pie de la propuesta."),
  clientBrief: z
    .string()
    .min(1)
    .describe(
      "Resumen en 2-4 oraciones de las necesidades y preferencias que el cliente expresó, " +
        "escrito para que el cliente se reconozca en él.",
    ),
  selections: z
    .array(proposalSelectionSchema)
    .min(1)
    .max(8)
    .describe("Propiedades propuestas, ordenadas de mejor a peor encaje."),
  recommendations: z
    .array(z.string().min(1))
    .min(1)
    .max(6)
    .describe("Recomendaciones y próximos pasos para el cliente."),
  closingNote: z
    .string()
    .optional()
    .describe("Cierre opcional, ej. disponibilidad para visitas."),
});

export type Proposal = z.infer<typeof proposalSchema>;
export type ProposalSelection = z.infer<typeof proposalSelectionSchema>;

export type EnrichedSelection = ProposalSelection & { property: Property };

export type EnrichedProposal = Omit<Proposal, "selections"> & {
  selections: EnrichedSelection[];
  /** IDs que la API no devolvió; se excluyen de la propuesta. */
  missingPropertyIds: string[];
};

/** Trae los datos actuales de cada propiedad para que precios y estado no queden desactualizados. */
export async function enrichProposal(
  proposal: Proposal,
  signal?: AbortSignal,
): Promise<EnrichedProposal> {
  const settled = await Promise.all(
    proposal.selections.map(async (selection) => {
      try {
        return { ...selection, property: await getProperty(selection.propertyId, signal) };
      } catch {
        return null;
      }
    }),
  );

  const selections = settled.filter((item): item is EnrichedSelection => item !== null);
  const found = new Set(selections.map((item) => item.propertyId));

  if (selections.length === 0) {
    throw new Error(
      "Ninguna de las propiedades seleccionadas pudo recuperarse de KiteProp. " +
        "Verificá los IDs con kiteprop__search_properties antes de armar la propuesta.",
    );
  }

  return {
    ...proposal,
    missingPropertyIds: proposal.selections
      .map((item) => item.propertyId)
      .filter((id) => !found.has(id)),
    selections,
  };
}

/** Resumen en markdown: lo que el asesor revisa antes de aprobar el envío. */
export function renderProposalMarkdown(proposal: EnrichedProposal): string {
  const lines: string[] = [
    `## Propuesta para ${proposal.clientName}`,
    "",
    proposal.clientBrief,
    "",
    `### ${proposal.selections.length} ${proposal.selections.length === 1 ? "opción" : "opciones"}`,
    "",
  ];

  proposal.selections.forEach((selection, index) => {
    const { property } = selection;
    const specs = describeSpecs(property).join(" · ");

    lines.push(
      `**${index + 1}. ${property.title}** — ${formatPrice(property)}`,
      describeLocation(property) || "Ubicación a confirmar",
      specs,
      selection.whyItFits,
      selection.caveat ? `A tener en cuenta: ${selection.caveat}` : "",
      "",
    );
  });

  lines.push("### Recomendaciones", "");
  for (const recommendation of proposal.recommendations) {
    lines.push(`- ${recommendation}`);
  }

  if (proposal.closingNote) {
    lines.push("", proposal.closingNote);
  }

  if (proposal.missingPropertyIds.length > 0) {
    lines.push(
      "",
      `> No se pudieron recuperar de KiteProp: ${proposal.missingPropertyIds.join(", ")}`,
    );
  }

  return lines.filter((line, index, all) => !(line === "" && all[index - 1] === "")).join("\n");
}
