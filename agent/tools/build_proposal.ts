import { defineTool } from "eve/tools";
import { enrichProposal, proposalSchema, renderProposalMarkdown } from "../lib/proposal";

export default defineTool({
  description:
    "Arma la propuesta para el cliente a partir de las propiedades elegidas: vuelve a consultar " +
    "KiteProp para tener precios y estado actualizados y devuelve el resumen listo para que el " +
    "asesor lo revise. No envía nada. Llamala antes de send_proposal_email y mostrale el " +
    "resumen al asesor para que lo apruebe o lo corrija.",
  inputSchema: proposalSchema,
  async execute(input, ctx) {
    const proposal = await enrichProposal(input, ctx.abortSignal);

    return {
      summary: renderProposalMarkdown(proposal),
      propertyCount: proposal.selections.length,
      missingPropertyIds: proposal.missingPropertyIds,
      properties: proposal.selections.map(({ property }) => ({
        id: property.id,
        title: property.title,
        price: property.price,
        currency: property.currency,
        status: property.status,
      })),
    };
  },
});
