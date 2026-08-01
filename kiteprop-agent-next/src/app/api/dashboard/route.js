import { callClaude, extractToolCalls } from "@/lib/claude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INSTRUCTIONS = `Necesito el dashboard completo de la inmobiliaria. Llama, en este orden, a estas herramientas de KiteProp con parametros por defecto razonables (ultimo mes / periodo actual si la herramienta lo requiere):
1. get_dashboard_stats
2. get_message_stats
3. get_agent_stats
4. get_property_performance
No hace falta que escribas un resumen en texto al final, con llamar a las 4 herramientas alcanza.`;

export async function GET() {
  if (!process.env.ANTHROPIC_API_KEY || !process.env.KITEPROP_API_KEY) {
    return Response.json(
      { error: "Faltan variables de entorno. Copia .env.example a .env.local y completa las claves." },
      { status: 500 }
    );
  }

  try {
    const response = await callClaude({
      messages: [{ role: "user", content: INSTRUCTIONS }],
      maxTokens: 6000,
    });
    const { calls } = extractToolCalls(response);
    const byTool = {};
    for (const call of calls) {
      byTool[call.name] = { input: call.input, isError: call.isError, result: call.result };
    }
    return Response.json({ tools: byTool });
  } catch (err) {
    return Response.json({ error: err.message || "Error interno" }, { status: err.status || 500 });
  }
}
