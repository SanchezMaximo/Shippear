import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

/**
 * Emite un token de un solo uso para que el navegador hable directo con Scribe
 * sin ver nunca la API key. Expira a los 15 minutos y se consume al conectarse.
 *
 * OJO: esta ruta es pública, igual que el resto de la app. Cuando haya login,
 * ponerle el mismo guard que al chat: un token acá es cuota de audio gastable.
 */
export async function POST() {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Falta ELEVENLABS_API_KEY: el dictado por voz está deshabilitado." },
      { status: 503 },
    );
  }

  try {
    const { token } = await new ElevenLabsClient({ apiKey }).tokens.singleUse.create(
      "realtime_scribe",
    );

    return Response.json({ token });
  } catch (error) {
    console.error("[scribe-token] no se pudo emitir el token", error);

    return Response.json({ error: "No se pudo iniciar el dictado por voz." }, { status: 502 });
  }
}
