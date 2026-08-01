import { callClaude, extractToolCalls } from "@/lib/claude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.KITEPROP_API_KEY) {
    return Response.json(
      { error: "Faltan variables de entorno. Copia .env.example a .env.local y completa las claves." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch (_) {
    body = {};
  }

  const { query } = body || {};
  if (!query || typeof query !== "string") {
    return Response.json({ error: "Falta 'query' (texto de búsqueda)." }, { status: 400 });
  }

  const instructions = `Usa la herramienta search_properties de KiteProp para esta busqueda: "${query}". Si hace falta interpretar filtros (precio, ambientes, ubicacion, tipo de operacion, amenities) traducilos a los parametros de la herramienta. No hace falta que escribas un resumen en texto, alcanza con el resultado de la herramienta.`;

  try {
    const response = await callClaude({
      messages: [{ role: "user", content: instructions }],
      maxTokens: 4000,
    });
    const { calls, finalText } = extractToolCalls(response);
    const searchCall = calls.find((c) => c.name === "search_properties") || calls[0];
    return Response.json({
      result: searchCall ? searchCall.result : null,
      isError: searchCall ? searchCall.isError : false,
      note: searchCall ? null : finalText || "No se encontró una llamada a search_properties.",
    });
  } catch (err) {
    return Response.json({ error: err.message || "Error interno" }, { status: err.status || 500 });
  }
}
