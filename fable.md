# fable.md — Rol de Orquestador (handoff desde Codex)

> Este documento resume la **funcionalidad de orquestador** que venía cumpliendo la sesión de Codex
> (gpt-5.6-sol), para que una sesión de Claude con Fable la retome sin perder contexto.

---

## 1. Qué es el proyecto

**Kigent** (nombre interno del repo) = **AI Property Match**: un asistente de IA para inmobiliarias que
escucha la llamada con el cliente, extrae en tiempo real el perfil de búsqueda (operación, tipo,
zona, presupuesto, dormitorios, cochera, urgencia, etc.), hace *matching* contra el CRM y genera una
propuesta/ranking de propiedades. Ver `problematica.md` para el detalle completo del producto.

**Contexto:** hackatón de ~5 horas. **El equipo de esta terminal se encarga EXCLUSIVAMENTE de la landing page.**
Otro equipo hace backend, MCP, agente y producto.

**Objetivo de la landing:** calidad visual **nivel Awwwards**.

---

## 2. Rol del orquestador (lo que hace Fable)

- **Define** dirección creativa, arquitectura de la landing, prioridades y control de calidad (QA).
- **Delega** tareas concretas creativas/técnicas a un ejecutor (otra sesión de Claude, o el humano).
- **No implementa a ciegas:** primero audita, planifica y divide; revisa la calidad de lo entregado.
- **Flujo de trabajo:**
  1. Auditoría técnica y visual acotada del estado actual.
  2. Dividir la landing en **entregables cortos e iterativos**.
  3. Delegar cada entregable, revisar, iterar.

---

## 3. Decisiones ya tomadas (no re-litigar)

- **Estructura de rutas:** `/app` conserva la experiencia actual (el agent-chat que ya existe en
  `app/_components/`); la **raíz `/` pasa a ser la landing** nueva.
- **NO configurar claves todavía** (`KITEPROP_*`, `RESEND_*`, `AI_GATEWAY_API_KEY`). La landing se puede
  construir y revisar sin keys; esas features son del otro equipo.
- El pull/actualización del repo ya lo hizo el humano (no re-intentar `git pull` desde el sandbox, ver §5).

---

## 4. Stack técnico

- **Next.js 16** (preview, **Turbopack**). ⚠️ Tiene *breaking changes* respecto a lo que conocés:
  **leé `node_modules/next/dist/docs/` ANTES de escribir código.** El bloque de reglas en `AGENTS.md`
  lo reinyecta `next dev`; commitealo junto con tu trabajo para no ensuciar el árbol.
- **eve** (framework de Vercel, el runner). Antes de implementar una integración, descubrí con
  `eve registry search <query>` / `eve registry list`, inspeccioná con `eve registry view <item>`,
  instalá con `eve add <item>`. Docs en `node_modules/eve/docs/`.
- **shadcn/ui** (componentes en `components/ui/`), **ai-elements** (`components/ai-elements/`),
  **Tailwind v4**, **AI SDK v7** (`ai`), **React 19**, **motion** (animaciones), **lucide-react** (íconos).
- Config de shadcn en `components.json`; utilidades en `lib/utils.ts`.

---

## 5. Cómo levantar y trabajar (gotchas del entorno)

- **`node` NO está en el PATH por defecto** en estas shells. Cargá nvm primero:
  ```bash
  source ~/.nvm/nvm.sh   # node v24.18.1 (coincide con engines: node 24.x)
  ```
- **Levantar solo el front:** `npm run web` → `next dev` en **http://localhost:3000**.
- **Stack completo (front + agente eve):** `npm run dev` → `eve dev`.
- Typecheck: `npm run typecheck`. Build: `npm run build`.
- El dev server ya quedó corriendo en http://localhost:3000 (título actual: "eve Next.js Starter" — es el
  template base, la landing todavía no está construida).
- ⚠️ **Sandbox sin red:** las terminales de agente corren con la red bloqueada
  (`CODEX_SANDBOX_NETWORK_DISABLED=1`). Cualquier comando que necesite internet (`git pull/fetch`,
  `npm install`) se **cuelga** desde ahí. Correr esos desde una shell con red (la del humano).

---

## 6. Estado actual al hacer el handoff

- Repo **instalado** (`node_modules` presente), en branch `main` (último merge: PR #1 kigent-auth-proposal-id).
- Estructura existente: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/_components/agent-chat.tsx`,
  `app/_components/agent-message.tsx`, componentes shadcn + ai-elements.
- **Próximo paso pendiente** (última orden dada a Codex): mover la experiencia actual a `/app` y
  **arrancar la landing en `/`**. Codex quedó leyendo contexto para eso pero se lo reemplaza por lentitud.

---

## 6.bis Bitácora obligatoria — `pasos.md`

**Andá registrando en `pasos.md` cada cosa que hacés.** Ese archivo es la bitácora de la hackatón:
cada decisión, entregable, cambio de estructura o tarea delegada debe quedar anotada ahí, corta y
fechada, para que el resto del equipo (y el humano) siga el hilo sin preguntarte. Actualizalo a medida
que avanzás, no al final.

## 7. Primer movimiento sugerido para Fable

1. `source ~/.nvm/nvm.sh` y confirmar que `npm run web` sirve la app en localhost:3000.
2. Auditoría acotada: leer `app/page.tsx`, `app/layout.tsx`, `app/globals.css` y las docs de Next en
   `node_modules/next/dist/docs/` (routing/metadata/fonts).
3. Reubicar la experiencia actual a la ruta `/app` y dejar `/` libre para la landing.
4. Definir el primer entregable de la landing (hero + estructura) y delegarlo/implementarlo iterando.
