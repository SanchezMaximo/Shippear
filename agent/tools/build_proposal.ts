import { defineTool } from "eve/tools";
import { enrichProposal, proposalSchema, renderProposalMarkdown } from "../lib/proposal";
import { saveProposal } from "../lib/proposal-store";

export default defineTool({
  description:
    "Arma la propuesta para el cliente a partir de las propiedades elegidas: vuelve a consultar " +
    "KiteProp para tener precios y estado actualizados, la guarda, y devuelve el resumen junto " +
    "con un `proposalId`. No envía nada. Mostrale el resumen al asesor para que lo apruebe o lo " +
    "corrija, y después pasale ese mismo `proposalId` a send_proposal_email. Si el asesor pide " +
    "cambios, volvé a llamar a esta tool con la propuesta corregida: devuelve un ID nuevo.",
  inputSchema: proposalSchema,
  async execute(input, ctx) {
    const proposal = await enrichProposal(input, ctx.abortSignal);
    const proposalId = saveProposal(proposal);

    return {
      proposalId,
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
