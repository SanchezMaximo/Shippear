// Modulo server-only: usa API keys, nunca se debe importar desde un componente
// de cliente. Solo se importa desde route handlers en src/app/api/**.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MCP_BETA = "mcp-client-2025-11-20";

function systemPrompt() {
  const agencyName = process.env.AGENCY_NAME || "la inmobiliaria";
  return `Sos el asistente de IA de ${agencyName}, una inmobiliaria. Tenés acceso al MCP de KiteProp, que expone herramientas para gestionar propiedades, contactos, mensajes, difusiones en portales, usuarios, estadisticas, feedback de visitas y analisis avanzado.

Reglas de comportamiento:
- Respondes siempre en español rioplatense, de forma clara, breve y profesional. Nada de rodeos innecesarios.
- Usa las herramientas de KiteProp cada vez que la pregunta requiera datos reales (propiedades, contactos, mensajes, estadisticas, feedback). No inventes datos ni numeros: si una herramienta no trae lo pedido, decilo.
- Antes de ejecutar una accion que MODIFICA datos (update_property_status, create_contact, create_message, create_visit_feedback), confirma en una linea que vas a hacer eso, salvo que el pedido del usuario ya haya sido explicito y con todos los datos necesarios (en ese caso, ejecuta directo y despues confirma que quedo hecho).
- Cuando muestres resultados de propiedades, contactos o mensajes, resumilos en una lista corta y clara (no pegues JSON crudo).
- Si te piden un analisis o diagnostico que cruza varias fuentes (por ejemplo dashboard + agentes + portales), combina las herramientas necesarias y presenta un resumen ejecutivo con los numeros clave primero, y despues el detalle si hace falta.
- Si algo no esta disponible en las herramientas de KiteProp, decilo directamente en vez de inventar.`;
}

function kitepropServerConfig() {
  const baseUrl = process.env.KITEPROP_MCP_URL || "https://mcp.kiteprop.com/mcp";
  const apiKey = process.env.KITEPROP_API_KEY;
  if (!apiKey) {
    throw new Error("Falta KITEPROP_API_KEY en las variables de entorno");
  }
  const url = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}api_key=${encodeURIComponent(apiKey)}`;
  return { type: "url", url, name: "kiteprop" };
}

function baseHeaders() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Falta ANTHROPIC_API_KEY en las variables de entorno");
  }
  return {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-beta": MCP_BETA,
  };
}

function buildRequestBody({ messages, system, stream, maxTokens }) {
  return {
    model: process.env.CLAUDE_MODEL || "claude-sonnet-5",
    max_tokens: maxTokens || 4096,
    stream: !!stream,
    system: system || systemPrompt(),
    messages,
    mcp_servers: [kitepropServerConfig()],
    tools: [{ type: "mcp_toolset", mcp_server_name: "kiteprop" }],
  };
}

// Llamada streaming: devuelve el Response crudo de fetch. En un route handler
// de Next.js, `res.body` (ReadableStream web-standard) se puede devolver
// directo como body de la Response de salida, sin copiar manualmente.
export async function streamClaude({ messages, system, maxTokens }) {
  const body = buildRequestBody({ messages, system, stream: true, maxTokens });
  return fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify(body),
  });
}

// Llamada no-streaming: devuelve el JSON completo de la respuesta de Claude
export async function callClaude({ messages, system, maxTokens }) {
  const body = buildRequestBody({ messages, system, stream: false, maxTokens });
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    const message = json?.error?.message || `Error ${res.status} llamando a Claude`;
    const err = new Error(message);
    err.status = res.status;
    err.details = json;
    throw err;
  }
  return json;
}

// Extrae, de una respuesta no-streaming, los resultados de las herramientas
// MCP invocadas: [{ name, input, isError, result }]
export function extractToolCalls(response) {
  const content = response?.content || [];
  const useById = new Map();
  const calls = [];

  for (const block of content) {
    if (block.type === "mcp_tool_use") useById.set(block.id, block);
  }
  for (const block of content) {
    if (block.type === "mcp_tool_result") {
      const use = useById.get(block.tool_use_id);
      const textParts = (block.content || [])
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");
      let parsed = textParts;
      try {
        parsed = JSON.parse(textParts);
      } catch (_) {
        // no era JSON, dejamos el texto tal cual
      }
      calls.push({
        name: use?.name || "desconocida",
        input: use?.input || {},
        isError: !!block.is_error,
        result: parsed,
      });
    }
  }

  const finalText = content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return { calls, finalText };
}
