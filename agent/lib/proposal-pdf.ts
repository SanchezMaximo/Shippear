/**
 * Render de la propuesta a PDF con pdf-lib (sin dependencias nativas, corre en
 * el runtime serverless de Vercel).
 */

import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import { DEMO_NOTICE, isDemoMode } from "./demo-catalog";
import { describeLocation, describeSpecs, formatPrice, humanize } from "./kiteprop";
import type { EnrichedProposal } from "./proposal";

const PAGE = { height: 841.89, width: 595.28 }; // A4 en puntos
const MARGIN = 48;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;

const INK = rgb(0.11, 0.12, 0.15);
const MUTED = rgb(0.42, 0.45, 0.5);
const ACCENT = rgb(0.08, 0.4, 0.75);
const RULE = rgb(0.86, 0.88, 0.91);
const WARNING_BG = rgb(0.99, 0.93, 0.93);
const WARNING_INK = rgb(0.7, 0.13, 0.13);

/**
 * Helvetica usa WinAnsi, que cubre el español pero no todo Unicode. Sustituye
 * lo que no entra (comillas tipográficas, guiones largos, emoji) para que
 * pdf-lib no falle al codificar el texto.
 */
function sanitize(text: string): string {
  return text
    .replaceAll(/[\u2018\u2019\u201B]/g, "'")
    .replaceAll(/[\u201C\u201D]/g, '"')
    .replaceAll(/[\u2013\u2014]/g, "-")
    .replaceAll(/\u2026/g, "...")
    .replaceAll(/[\u00A0\u202F\u2009]/g, " ")
    .replaceAll(/[^\u0020-\u00FF]/g, "");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];

  for (const paragraph of sanitize(text).split("\n")) {
    let current = "";

    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      current = word;
    }

    lines.push(current);
  }

  return lines.length > 0 ? lines : [""];
}

type Cursor = { page: PDFPage; y: number };

export async function renderProposalPdf(proposal: EnrichedProposal): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  pdf.setTitle(`Propuesta inmobiliaria - ${sanitize(proposal.clientName)}`);
  pdf.setAuthor(sanitize(proposal.advisorName));
  pdf.setCreator("Kigent");

  const cursor: Cursor = { page: pdf.addPage([PAGE.width, PAGE.height]), y: PAGE.height - MARGIN };

  const newPage = () => {
    cursor.page = pdf.addPage([PAGE.width, PAGE.height]);
    cursor.y = PAGE.height - MARGIN;
  };

  const ensure = (needed: number) => {
    if (cursor.y - needed < MARGIN) newPage();
  };

  const text = (
    value: string,
    options: {
      color?: ReturnType<typeof rgb>;
      font?: PDFFont;
      gap?: number;
      indent?: number;
      size?: number;
    } = {},
  ) => {
    const font = options.font ?? regular;
    const size = options.size ?? 10.5;
    const indent = options.indent ?? 0;
    const lineHeight = size * 1.35;

    for (const line of wrap(value, font, size, CONTENT_WIDTH - indent)) {
      ensure(lineHeight);
      cursor.page.drawText(line, {
        color: options.color ?? INK,
        font,
        size,
        x: MARGIN + indent,
        y: cursor.y - size,
      });
      cursor.y -= lineHeight;
    }

    cursor.y -= options.gap ?? 0;
  };

  const rule = (gap = 10) => {
    ensure(gap * 2);
    cursor.page.drawLine({
      color: RULE,
      end: { x: PAGE.width - MARGIN, y: cursor.y },
      start: { x: MARGIN, y: cursor.y },
      thickness: 0.75,
    });
    cursor.y -= gap;
  };

  // Encabezado
  text("PROPUESTA DE PROPIEDADES", { color: ACCENT, font: bold, size: 9 });
  cursor.y -= 4;
  text(`Para ${proposal.clientName}`, { font: bold, size: 22 });
  text(
    `Preparada por ${proposal.advisorName}${
      proposal.advisorContact ? ` - ${proposal.advisorContact}` : ""
    } - ${new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(new Date())}`,
    { color: MUTED, gap: 6, size: 9.5 },
  );
  rule(16);

  // Franja de demo: el PDF es lo que llega al cliente, así que la advertencia
  // va arriba de todo y en rojo, no en una nota al pie.
  if (isDemoMode()) {
    ensure(34);
    cursor.page.drawRectangle({
      color: WARNING_BG,
      height: 30,
      width: CONTENT_WIDTH,
      x: MARGIN,
      y: cursor.y - 30,
    });
    cursor.y -= 9;
    text(DEMO_NOTICE, { color: WARNING_INK, font: bold, gap: 20, indent: 8, size: 8.5 });
  }

  // Lo que buscás
  text("Lo que nos contaste", { font: bold, gap: 4, size: 12 });
  text(proposal.clientBrief, { color: MUTED, gap: 16 });

  // Opciones
  text(
    `${proposal.selections.length} ${
      proposal.selections.length === 1 ? "opción seleccionada" : "opciones seleccionadas"
    }`,
    { font: bold, gap: 8, size: 12 },
  );

  proposal.selections.forEach((selection, index) => {
    const { property } = selection;

    ensure(90);
    text(`${index + 1}. ${property.title}`, { font: bold, size: 12.5 });
    text(formatPrice(property), { color: ACCENT, font: bold, size: 11 });

    const location = describeLocation(property);
    if (location) text(location, { color: MUTED, size: 9.5 });

    const specs = [
      humanize(property.propertyType),
      humanize(property.operation),
      ...describeSpecs(property),
      ...property.features.slice(0, 4),
    ].join("  ·  ");

    if (specs) text(specs, { color: MUTED, size: 9.5 });

    cursor.y -= 4;
    text(selection.whyItFits, { indent: 0 });

    if (selection.caveat) {
      text(`A tener en cuenta: ${selection.caveat}`, { color: MUTED, size: 9.5 });
    }
    if (property.url) {
      text(property.url, { color: ACCENT, size: 9 });
    }

    text(`Referencia KiteProp: ${property.id}`, { color: MUTED, gap: 6, size: 8.5 });

    if (index < proposal.selections.length - 1) rule(12);
  });

  rule(16);

  // Recomendaciones
  text("Recomendaciones y próximos pasos", { font: bold, gap: 6, size: 12 });
  for (const recommendation of proposal.recommendations) {
    text(`-  ${recommendation}`, { gap: 2 });
  }

  if (proposal.closingNote) {
    cursor.y -= 10;
    text(proposal.closingNote, { color: MUTED });
  }

  cursor.y -= 14;
  rule(12);
  text(
    "Los valores y la disponibilidad son los publicados en KiteProp al momento de emitir esta " +
      "propuesta y pueden variar. Documento informativo: no constituye una oferta ni una reserva.",
    { color: MUTED, size: 8 },
  );

  return pdf.save();
}

export function proposalFileName(proposal: EnrichedProposal): string {
  const slug = sanitize(proposal.clientName)
    .toLowerCase()
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/g, "")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");

  return `propuesta-${slug || "cliente"}.pdf`;
}
