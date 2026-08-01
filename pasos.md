# Pasos hackatón — Kigent / AI Property Match

## 2026-08-01

- **Reestructura de rutas.** Se liberó el home `/` para la landing y se movió la experiencia del
  asistente a `/app`.
  - `app/app/page.tsx` → renderiza `AgentChat` (título "Kigent — Asistente").
  - `app/page.tsx` → nueva **landing** de AI Property Match (hero + CTA "Probar el asistente" → `/app`).
  - Verificado en dev: `/` y `/app` responden HTTP 200 en http://localhost:3000.
- Entorno: `source ~/.nvm/nvm.sh` (node v24.18.1), front con `npm run web`.
- Pendiente: construir la landing completa (nivel Awwwards) sobre el hero base.

## 2026-08-01 — Fable asume como orquestador (handoff desde Codex)

- Rol confirmado: Fable **orquesta y hace QA, no implementa**; el código lo escribe la sesión
  ejecutora de Claude (coordinación vía `orca terminal send/read`).
- ⚠️ Conflicto resuelto: orquestador y ejecutor tocaron `app/page.tsx` en paralelo. Quedó la
  versión completa de la landing (reemplaza al hero mínimo del ejecutor).
- **Entregable 1 ya en el repo** (dirección visual: dark `zinc-950` + acento `emerald`, Geist/Geist Mono):
  - `app/_components/landing/hero.tsx` — hero con demo animada de llamada en vivo
    (transcript → chips de perfil detectado → match 97%).
  - `app/_components/landing/sections.tsx` — nav sticky, cómo funciona (3 pasos), matching con
    ranking y barras de compatibilidad, inferencias ("tengo dos hijos" → señales), beneficios,
    CTA final, footer.
  - `app/page.tsx` — compone todo; metadata propia de landing.
- **Delegado al ejecutor (term_95462549):** QA del entregable 1 — `npm run typecheck` +
  verificación visual de `/` y `/app`, reportar hallazgos sin refactorizar.
- QA estático del orquestador: `/` sirve la landing nueva (title OK, demo del hero presente),
  `/app` responde 200. Browser de Fable sin extensión conectada → la verificación visual la hace
  el ejecutor.

### Roadmap de entregables (orquestador)

1. ✅ **E1 — Hero + estructura completa** (en repo, en QA).
2. **E2 — Hero nivel Awwwards:** loop infinito de la demo de llamada (transcript se reinicia),
   efecto typing en las líneas, textura de grano sutil, easings más ricos, responsive mobile fino.
3. **E3 — Secciones vivas:** animaciones scroll-driven en matching (barras + stagger), hover
   states con profundidad en cards, transición suave entre secciones.
4. **E4 — Detalles finales:** favicon + OG image, `::selection` y scrollbar custom, microcopy,
   estados de foco accesibles.
5. **E5 — Cierre:** `npm run build` verde, responsive audit completo, performance.

Regla: cada entregable se delega por Orca, el ejecutor reporta, el orquestador revisa antes del
siguiente.

### QA entregable 1 (ejecutor — term_95462549)

**Resultado: APROBADO con 1 hallazgo menor (dev-only, no bloqueante).**

Verificaciones OK:
- ✅ `npm run typecheck` → **exit 0**, sin errores.
- ✅ `/` → HTTP 200, `<title>` correcto, SSR con dark `zinc-950` + `emerald`, hero presente.
- ✅ `/app` → HTTP 200, `<title>` "Kigent — Asistente" (chat intacto).
- ✅ `sections.tsx` → todos los `.map()` tienen `key` (STEPS, MATCHES, pros/cons, INFERENCES, signals, BENEFITS). Sin observaciones.

Hallazgos:
- ⚠️ **[H1] React "missing key" warning en consola (38 ocurrencias)** — `app/_components/landing/hero.tsx`.
  Se dispara solo en los dos `.map()` que renderizan `motion.span` **directo**: barras de audio
  (`hero.tsx:117-130`) y chips de perfil (`hero.tsx:153-162`). Ambos YA pasan `key`
  (`key={i}` / `key={chip.label}`), pero React 19 + `motion` v12 igual avisa cuando el elemento
  mapeado es un `motion.*` directo (en `sections.tsx` no pasa porque ahí se mapea `<Reveal>`, no
  `motion.*`). Es solo dev y no rompe render, pero ensucia la consola. Sugerencia para el
  implementador (NO lo toqué): envolver el `motion.span` en un elemento normal con la `key`, o
  extraer un subcomponente. **Requiere ojo del orquestador.**
- ℹ️ **[N1] `AI Gateway authentication failed` en el log** — es del agente en `/app`, **esperado**
  (no se configuraron keys, decisión del orquestador). No afecta la landing.
- ℹ️ **[N2] Menor, opcional:** en las barras de audio (`hero.tsx:118-122`) conviven
  `animate={{ height: [...] }}` y `style={{ height: h }}`; el `style` inline puede competir con la
  animación de motion. No se observó glitch, pero vale revisarlo al pulir E2.

No se modificó código. A la espera del próximo entregable del orquestador.

### E2 delegado (orquestador → ejecutor)

- QA de E1 revisado y aceptado. Nota del orquestador sobre H1: el diagnóstico "React avisa aunque
  haya key en motion.*" no es comportamiento conocido de React → se pidió confirmar la causa real
  antes de aplicar el fix.
- Alcance de E2 (en orden): fix H1 con causa confirmada, fix N2 (style height vs animate en
  barras de audio), loop infinito de la demo (~9s/ciclo con fade-out), grano sutil CSS en el hero
  (SVG feTurbulence, opacity ~0.04), responsive 390px sin overflow.
- Criterios de aceptación: consola sin warnings de React, typecheck verde, loop fluido, mobile OK.

### E2 — reporte ejecutor (term_95462549)

**Resultado: COMPLETADO.** Solo se tocó `app/_components/landing/hero.tsx` (no se tocó `sections.tsx`).

**Causa real de H1 (confirmada empíricamente, no era lo que dije en E1):**
- Aislé midiendo warnings por render SSR: **6 warnings = 6 chips** (`PROFILE_CHIPS`), NO las 12 barras.
- El `motion.span` de los chips era el único con **múltiples hijos** (dos `<span>`: label y value).
  `motion` v12 procesa internamente los hijos de un `motion.*` como una lista, y esos hijos no
  tenían key → React avisa "child in a list should have a unique key", apuntando a
  `ForwardRef(motion.span)` con "passed a child from Hero". La `key` del elemento mapeado es
  irrelevante para este warning. Las barras (self-closing, sin hijos) nunca lo dispararon.
- **Verificación:** poner key a los spans internos bajó el delta de 6→0. Confirmado.

**Cambios (archivo:línea sobre el hero.tsx nuevo):**
1. **FIX H1** — `hero.tsx:95-108` (chips): el `motion.span` ahora tiene **un solo hijo** (un `<span>`
   contenedor con los dos textos adentro). Sin lista de hijos en el motion → sin warning.
   Medido: **0 warnings por render** (antes 6).
2. **FIX N2** — `hero.tsx:51-63` (barras de audio): saqué `style={{ height: h }}`; ahora la altura la
   maneja motion con `initial={{ height: h }}` + `animate={{ height: [...] }}`. Sin conflicto style/animate.
3. **LOOP** — `hero.tsx:170-176` (state `cycle` + `setInterval` cada `CYCLE_MS=9000`) y
   `hero.tsx:230-241` (`AnimatePresence mode="wait"` con `motion.div key={cycle}` initial/animate/exit
   opacity). Al cambiar la key se **remonta `CallDemo`** y se reproduce toda la secuencia
   (transcript → chips → card de match), con **fade-out suave** antes de reiniciar. ~9s por vuelta.
4. **GRANO** — `hero.tsx:33-36` (const `GRAIN_SVG`, SVG `feTurbulence` como data-URI) + `hero.tsx:200-204`
   (div `absolute inset-0`, `opacity-[0.04]`, `pointer-events-none`, `aria-hidden`). CSS puro, sin assets.
5. **RESPONSIVE 390px** — guards contra overflow: `min-w-0` en columnas del grid (`:159`, `:243`),
   `shrink-0` en ícono/badge/barras, `truncate` en textos de la llamada, `flex-wrap` en chips,
   headline bajado a `text-4xl` en mobile (`sm:text-6xl lg:text-7xl`). `section` con `overflow-hidden`.

**Verificaciones:**
- ✅ `npm run typecheck` → exit 0.
- ✅ Warnings de React por render SSR: **0** (medido antes/después).
- ✅ Sin errores nuevos en el log (hidratación/AnimatePresence limpios).
- ✅ `/` → HTTP 200; grano presente en SSR (`feTurbulence` en el HTML).
- ⚠️ **Loop fluido y 390px NO verificados visualmente**: la extensión de Chrome no está conectada,
   así que no pude ver la animación ni medir el layout real. El código sigue el patrón pedido y los
   guards anti-overflow están puestos, pero **queda pendiente una confirmación visual** (orquestador
   o humano con browser). Es lo único sin cerrar de los criterios de aceptación.
