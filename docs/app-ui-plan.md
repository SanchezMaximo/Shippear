# Plan de migración UI de /app — "la consola de verdad"

> Spec del orquestador para el entregable **E-APP**. Objetivo: que al tocar "Probar el asistente"
> desde la landing, el visitante entre a **la misma consola que vio en el hero**. Continuidad
> total landing → producto. Solo presentación: la lógica eve (session, cancelación, input
> responses) NO se toca.

## Qué hay hoy (auditoría)

- `app/_components/agent-chat.tsx`: shell del chat (eve `useEveAgent` + ai-elements
  `Conversation`/`PromptInput`). Empty state: "Kigent" gigante + 3 ejemplos. Header mínimo con
  `StatusDot` (ya usa emerald ✓). Tema: tokens shadcn light-por-defecto (≠ landing dark fija).
- `app/_components/agent-message.tsx`: renderiza parts — text (con caret de streaming ✓),
  reasoning (colapsable, `defaultOpen`), dynamic-tool (búsquedas al CRM — el momento mágico),
  authorization, files. Colores sueltos: **yellow-500 en InputRequestActions (VETADO por Julian)**,
  blue-500 en auth, radios mixtos (`rounded-lg/md/xl`).
- Riesgo de coordinación: fable.md dice que "producto" es del otro equipo. Julian pidió esto
  explícitamente → se hace, pero solo capa visual, commits chicos y avisar al equipo.

## Dirección

/app ES la consola del hero hecha producto. Mismo lenguaje: dark zinc fijo + emerald, bordes
rectos (radius 2–4px), mono para datos/estados, editorial para el texto del agente. Elegante,
no hacker (regla maestra del guion).

## Feature nueva prioritaria: dictado por voz (pedido de Julian)

Como el dictado de ChatGPT/Claude: **botón de micrófono en el composer** que graba la
conversación y transcribe en vivo al textarea.

- **Implementación:** Web Speech API del browser (`SpeechRecognition`/`webkitSpeechRecognition`)
  — cero backend, ideal hackatón. `lang: "es-AR"`, `continuous: true`, `interimResults: true`.
- **UX:** botón mic junto al submit. Al grabar: estado visible (dot emerald pulsante +
  "escuchando…" + barras de nivel si da el tiempo); el texto interim va apareciendo en el
  textarea en vivo; al frenar, el transcript queda editable y se envía normal.
- **Fallbacks:** sin soporte de API → botón oculto; permiso de mic denegado → mensaje claro.
- **Narrativa:** es el puente con la landing — "Kigent escucha" deja de ser demo y es producto.
  El asesor puede grabar el resumen de la llamada (o la llamada en altavoz) y Kigent lo toma.

## Cambios por entregable (E-APP, en orden)

0. **Dictado por voz en el composer** (lo de arriba — va PRIMERO).

1. **Tema oscuro fijo en `/app`** — wrapper con los mismos tokens de la landing
   (`app/app/page.tsx` o layout de ruta). Sin tocar el tema del resto.
2. **Header de consola**: `KIGENT_` (link a `/`), StatusDot existente + estado en mono
   ("escuchando · listo · pensando"), hora de sesión. Altura actual, más carácter.
3. **Empty state**: "Nueva consulta" como llamada entrante — h1 con reveal editorial por máscara
   (mismo del hero), ejemplos como fichas de perfil (mono, borde 1px, hover que *muestra datos*:
   "3 amb · Palermo · ≤900k"), stagger de entrada.
4. **Mensajes con motion**: entrada de cada mensaje con fade+y seco (0.3s, AnimatePresence);
   caret de streaming se conserva.
5. **Tool calls como operaciones de consola** (prioridad demo): header mono con estado vivo
   (dot emerald pulsante + barra indeterminada fina mientras corre; ✓ con spring al completar).
   Es "Kigent buscando en el CRM" — tiene que sentirse como el matching de la landing.
6. **Fix de colores vetados/incoherentes**: yellow-500 → emerald/neutral; blue-500 auth →
   neutral; radios unificados a 2–4px.
7. **Reasoning**: colapsado al terminar el stream (abierto mientras streamea).
8. **Error state** estilizado consola (hoy es card destructive genérica) — importante porque sin
   keys el agente falla y ESO es lo que se ve en dev.
9. **Stretch**: transición landing→app continuando la metáfora (el CTA "abre" la consola).

## Verificación

Sin keys configuradas el agente no responde: verificar animaciones con el empty state, el envío
(mensaje optimista), el error state estilizado, y los ejemplos. Typecheck + 0 warnings como
siempre. No tocar `components/ai-elements/*` salvo necesidad puntual documentada.

## Posición en roadmap

E3-WOW (checkpoint 2) → **E-APP** (pedido directo de Julian) → E3b → E4 → E5.
