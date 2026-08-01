import { streamClaude } from "@/lib/claude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fatalErrorStream(message) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`event: fatal_error\ndata: ${JSON.stringify({ message })}\n\n`));
      controller.close();
    },
  });
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (_) {
    body = {};
  }

  const { messages } = body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Falta el array 'messages'." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY || !process.env.KITEPROP_API_KEY) {
    return Response.json(
      { error: "Faltan variables de entorno. Copia .env.example a .env.local y completa las claves." },
      { status: 500 }
    );
  }

  try {
    const upstream = await streamClaude({ messages });

    if (!upstream.ok || !upstream.body) {
      const errJson = await upstream.json().catch(() => ({}));
      const message = errJson?.error?.message || `Error ${upstream.status} conectando con Claude`;
      return new Response(fatalErrorStream(message), {
        headers: { "Content-Type": "text/event-stream" },
      });
    }

    // El body de fetch ya es un ReadableStream web-standard: lo pasamos
    // directo como body de la Response de salida (proxy SSE sin copiar).
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(fatalErrorStream(err.message || "Error interno"), {
      headers: { "Content-Type": "text/event-stream" },
    });
  }
}
