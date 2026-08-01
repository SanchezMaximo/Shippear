import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { Resend } from "resend";
import { z } from "zod";
import { describeLocation, formatPrice } from "../lib/kiteprop";
import { proposalFileName, renderProposalPdf } from "../lib/proposal-pdf";
import type { EnrichedProposal } from "../lib/proposal";
import { loadProposal } from "../lib/proposal-store";

/**
 * El envío queda detrás de `always()`: nada sale al cliente sin que el asesor
 * apruebe explícitamente la propuesta en el chat.
 *
 * Recibe un `proposalId`, no la propuesta entera: el contenido se lee tal cual
 * lo dejó `build_proposal`, así que el cliente recibe literalmente lo que el
 * asesor aprobó. El modelo no puede alterarlo al reenviarlo, y tampoco se
 * vuelve a consultar KiteProp — antes, una propiedad despublicada entre la
 * aprobación y el envío desaparecía del PDF sin que nadie se enterara.
 */
export default defineTool({
  description:
    "Genera el PDF de la propuesta y se lo envía por email al cliente. Requiere aprobación del " +
    "asesor antes de ejecutarse. Pasale el `proposalId` que devolvió build_proposal: se envía " +
    "esa propuesta exacta. Si el asesor pidió cambios, volvé a llamar a build_proposal y usá el " +
    "ID nuevo.",
  inputSchema: z.object({
    proposalId: z
      .string()
      .min(1)
      .describe("El `proposalId` que devolvió build_proposal para la propuesta que se aprobó."),
    clientEmail: z.email().describe("Email del cliente destinatario."),
    ccAdvisorEmail: z
      .email()
      .optional()
      .describe("Email del asesor para recibir copia del envío."),
    subject: z
      .string()
      .optional()
      .describe("Asunto del email. Default: 'Propuesta de propiedades para <cliente>'."),
  }),
  approval: always(),
  async execute({ ccAdvisorEmail, clientEmail, proposalId, subject }) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.PROPOSAL_FROM_EMAIL;

    if (!apiKey || !from) {
      throw new Error(
        "Faltan RESEND_API_KEY y/o PROPOSAL_FROM_EMAIL. Cargalas en .env.local (desarrollo) o " +
          "en el proyecto de Vercel (producción). PROPOSAL_FROM_EMAIL debe usar un dominio " +
          "verificado en Resend, ej. \"Inmobiliaria <propuestas@tudominio.com>\".",
      );
    }

    const proposal = loadProposal(proposalId);
    const pdf = await renderProposalPdf(proposal);
    const filename = proposalFileName(proposal);

    const { data, error } = await new Resend(apiKey).emails.send({
      attachments: [{ content: Buffer.from(pdf).toString("base64"), filename }],
      cc: ccAdvisorEmail ? [ccAdvisorEmail] : undefined,
      from,
      html: renderEmailHtml(proposal),
      subject: subject ?? `Propuesta de propiedades para ${proposal.clientName}`,
      text: renderEmailText(proposal),
      to: [clientEmail],
    });

    if (error) {
      throw new Error(`Resend rechazó el envío: ${error.name} - ${error.message}`);
    }

    return {
      sent: true,
      proposalId,
      messageId: data?.id ?? null,
      to: clientEmail,
      cc: ccAdvisorEmail ?? null,
      attachment: filename,
      propertyCount: proposal.selections.length,
    };
  },
});

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderEmailHtml(proposal: EnrichedProposal): string {
  const items = proposal.selections
    .map((selection) => {
      const { property } = selection;
      const location = describeLocation(property);

      return `<li style="margin-bottom:14px">
        <strong>${escapeHtml(property.title)}</strong> — ${escapeHtml(formatPrice(property))}
        ${location ? `<br><span style="color:#6b7280">${escapeHtml(location)}</span>` : ""}
        <br>${escapeHtml(selection.whyItFits)}
      </li>`;
    })
    .join("");

  const recommendations = proposal.recommendations
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.55;color:#1c1f26;max-width:640px">
    <p>Hola ${escapeHtml(proposal.clientName)},</p>
    <p>${escapeHtml(proposal.clientBrief)}</p>
    <p>Te comparto las opciones que seleccionamos para vos:</p>
    <ul style="padding-left:18px">${items}</ul>
    <p><strong>Recomendaciones</strong></p>
    <ul style="padding-left:18px">${recommendations}</ul>
    ${proposal.closingNote ? `<p>${escapeHtml(proposal.closingNote)}</p>` : ""}
    <p>Adjunto va la propuesta completa en PDF.</p>
    <p style="color:#6b7280">${escapeHtml(proposal.advisorName)}${
      proposal.advisorContact ? `<br>${escapeHtml(proposal.advisorContact)}` : ""
    }</p>
  </div>`;
}

function renderEmailText(proposal: EnrichedProposal): string {
  const items = proposal.selections
    .map((selection, index) => {
      const { property } = selection;
      return [
        `${index + 1}. ${property.title} - ${formatPrice(property)}`,
        describeLocation(property),
        selection.whyItFits,
      ]
        .filter(Boolean)
        .join("\n   ");
    })
    .join("\n\n");

  return [
    `Hola ${proposal.clientName},`,
    "",
    proposal.clientBrief,
    "",
    "Opciones seleccionadas:",
    "",
    items,
    "",
    "Recomendaciones:",
    ...proposal.recommendations.map((item) => `- ${item}`),
    "",
    proposal.closingNote ?? "",
    "Adjunto va la propuesta completa en PDF.",
    "",
    proposal.advisorName,
    proposal.advisorContact ?? "",
  ]
    .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
    .join("\n");
}
