import { defineAgent } from "eve";

export default defineAgent({
  // Modelo más barato de los que el free tier del gateway habilita hoy.
  // Haiku 4.5 es la mitad de precio pero devuelve 403 en free tier;
  // claude-3-haiku sí está habilitado y es 8x más barato, pero puntuó peor en
  // los evals (6/9 gates vs 7/9) y agota el rate limit del free tier.
  // Si se compran créditos, pasar a "anthropic/claude-haiku-4.5".
  model: "anthropic/claude-sonnet-5",
  limits: {
    // Tope por sesión, como segunda línea de defensa detrás del budget del
    // gateway: ~$0.50 de input + ~$0.25 de output por sesión. Al llegar al
    // límite eve pausa y pide aprobación en vez de seguir gastando.
    maxInputTokensPerSession: 500_000,
    maxOutputTokensPerSession: 50_000,
  },
});
