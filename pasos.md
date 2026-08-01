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

### E2 revisado + cambio de dirección de arte (orquestador)

- E2 **aprobado**: causa de H1 confirmada empíricamente (motion.span con múltiples hijos), 0
  warnings medidos, loop 9s, grano, responsive. Buen trabajo de aislamiento del ejecutor.
- **Decisión del humano:** la landing se veía "hecha con IA" (dark+emerald+gradient-text+glows =
  receta reconocible). Se eligió nueva dirección: **"Consola de la llamada"** — la landing como
  consola de Kigent, transcript como hilo conductor. Mono-first, bordes rectos, tinta + ámbar
  único, lenguaje de terminal (timestamps, '>cliente:', logs de extracción, tablas).
- Roadmap actualizado: **E3a** tokens+nav+hero (delegado), **E3b** secciones al estilo consola,
  E4 detalles (favicon/OG/selection), E5 cierre (build+push).
- Push a origin pendiente de auth del humano (`gh auth login`); hay 1 commit local (f9c02db).

### E3a — reporte ejecutor (term_95462549)

**Resultado: COMPLETADO.** Fase 1 de 2 (tokens + nav + hero). NO se tocaron las secciones de
contenido; en `sections.tsx` solo se reescribió `LandingNav`.

**Archivos y cambios (archivo:línea):**
1. **Tokens/base** — `app/page.tsx:22-34` (const `theme: CSSProperties`): paleta de consola como CSS
   vars en el wrapper → `--kg-ink` tinta cálida `oklch(0.14 0.008 80)`, `--kg-amber`
   `oklch(0.78 0.15 70)`, más `--kg-panel/-line/-text/-dim` (stone). Se quitó `bg-zinc-950 text-zinc-50`;
   ahora bg/text salen de los vars. `colorScheme: dark`. Los tokens cascadean a nav y hero.
2. **LandingNav** — `sections.tsx:274-313`: logo `KIGENT` + **cursor ámbar parpadeante** (motion.span,
   blink duro con `times`), nav mono uppercase, botón rectangular `[ Abrir asistente ]` (borde ámbar,
   hover invertido). Sin `rounded-full`, sin `backdrop-blur`, sin emerald.
3. **Hero → consola** — `hero.tsx` reescrito:
   - Headline **mono bold** (`:120`), segunda línea en **ámbar sólido** (sin gradient-text).
   - Label `Kigent // AI Property Match` con cuadrado ámbar (`:116-117`).
   - Botones rectangulares `[ Abrir asistente ]` / `[ Cómo funciona ]`.
   - Consola (col. derecha): barra de estado `● LLAMADA EN CURSO … 00:02:47` con dot que late
     (`:170-190`), **medidor de nivel** de 12 barras rectas animadas (`:193-215`), y log que
     **loopea**: transcript con prefijo `>cliente:` (`:49-60`), extracciones como líneas de log ámbar
     `02:5x → key=value ✓` (`:63-73`), y **fila de match** `MATCH · Pellegrini 1450 · 97.0%` (`:75-91`).
   - **Conservado:** loop 9s (`CYCLE_MS` + `cycle` + `AnimatePresence` `:199-209`), grano
     (`GRAIN_SVG` `:31`, div `:106-110`), responsive (min-w-0/shrink-0/truncate/flex-1).
   - **Eliminado:** glow radial (borrado), gradient-text, glassmorphism/blur, pills.
   - **H1:** todos los `motion.*` tienen 0 o 1 hijo directo (los multi-hijo van envueltos en un `<span>`).

**Verificaciones:**
- ✅ `npm run typecheck` → exit 0 (los CSS vars custom tipan bien con @types/react 19).
- ✅ **0 warnings** de React por render SSR (medido antes/después).
- ✅ Sin emerald/teal en hero ni nav; sin `bg-clip-text`/`rounded-full`/`backdrop-blur`/`radial-gradient` en hero.
- ✅ `/` → HTTP 200; en SSR aparecen `KIGENT`, `>cliente:`, `00:02:47`, `Match` y el token ámbar `0.78 0.15 70`.
- ✅ Sin errores nuevos en el log (hidratación/AnimatePresence limpios).
- ⚠️ **Loop y 390px NO verificados visualmente** (extensión de Chrome sigue sin conectar). Guards de
   overflow puestos y patrón de loop igual al de E2 (ya validado), pero la confirmación visual queda
   pendiente para el humano/orquestador con browser.
- ℹ️ **Nota de coherencia (esperada):** las secciones (HowItWorks/Matching/…) siguen en zinc+emerald
   → contraste con el nuevo nav/hero hasta que se haga E3b. Es el estado intermedio previsto del plan.

### Ajuste de dirección (humano, durante E3a)

- **Los ámbar/amarillos no van.** Se mantiene íntegro el concepto "Consola de la llamada"
  (mono, rectos, timestamps, logs) pero con la **paleta original**: fondo near-black neutro
  (zinc) + acento **emerald**. Ejecutor redirigido en caliente; tokens `--kg-*` pasan a
  escala zinc con `--kg-accent` emerald. Guion (`docs/landing-guion.md`) actualizado.

### E3a — revert de color a zinc+emerald (ejecutor — term_95462549)

**Resultado: COMPLETADO.** Solo cambio de color; el concepto consola queda intacto.

- `page.tsx:22-34` — tokens reasignados: `--kg-ink oklch(0.145 0 0)` (near-black neutro),
  `--kg-panel 0.18 0 0`, `--kg-line 0.3 0 0`, `--kg-text 0.89 0 0`, `--kg-dim 0.62 0 0`, y
  **`--kg-amber` renombrado a `--kg-accent` = `oklch(0.77 0.15 165)` (emerald)**. Comentario actualizado.
- `hero.tsx` — 10 referencias `var(--kg-amber)` → `var(--kg-accent)` (headline emphasis, dot de
  estado, medidor, `>cliente:`, extracciones, ✓, badge MATCH, 97.0%).
- `sections.tsx` (LandingNav) — 2 referencias → `--kg-accent` (cursor + botón).

**Verificaciones:**
- ✅ `npm run typecheck` → exit 0.
- ✅ **0 warnings** por render SSR.
- ✅ **Cero ámbar residual**: sin `--kg-amber`, sin el color viejo `0.78 0.15 70`, sin la palabra
  "amber"/"ámbar" en los 3 archivos ni en el SSR.
- ✅ `/` → 200; en SSR: `--kg-accent`, near-black `0.145 0 0` y emerald `0.77 0.15 165` presentes;
   se conservan `KIGENT` y `>cliente:`.
- ⚠️ Visual (loop + 390px) sigue sin verificar por la extensión de Chrome desconectada.

### E3-WOW delegado (orquestador → ejecutor)

- Feedback del humano: "muy estándar, faltan animaciones GSAP/motion, cosas LOCAS, wow".
- Paleta revertida verificada (cero ámbar en grep; zinc + emerald de vuelta).
- Brief E3-WOW (reemplaza E3b), con motion v12 sin sumar gsap: **W1** scrollytelling del hero
  (consola pinned 250vh, el scroll maneja la llamada 00:00→03:00, rebobinable), **W2** headline
  con efecto decode/scramble por caracteres, **W3** waveform full-width reactiva a velocidad de
  scroll, **W4** marquee de señales + contadores con spring + CTA magnético, **W5** boot
  sequence 1.2s con sessionStorage. Reglas: 60fps (solo transform/opacity), reduced-motion,
  mobile OK. Checkpoint de revisión tras W1+W2.

### Adenda a E3-WOW (crítica visual externa integrada)

- El humano trajo una revisión de Codex sobre captura real del hero. El orquestador la evaluó:
  coincide con el guion en lo estructural y suma piezas nuevas → integradas al canon en
  `docs/landing-guion.md` (sección "Adenda") y bajadas al ejecutor en caliente.
- Claves nuevas: llamada humanizada (Sofía Martínez / asesor Martín), payoff visible al
  completar perfil, headline en 3 líneas + timestamp gigante tenue, consola +15-20%, marquee
  como puente entre folds, CTA '[ VER LA LLAMADA ]'.

### E3-WOW checkpoint 1 — reporte ejecutor (term_95462549)

**Estado: W1 (scrollytelling) + W2 (decode) COMPLETOS + adenda 1–4 y CTA integradas.** Falta W3–W5.
Archivos: nuevos `decode-text.tsx` y `persona.ts`; reescrito `hero.tsx`; `sections.tsx` (2 headings).

**W1 — Scrollytelling del hero (`hero.tsx`):**
- Contenedor `h-[150vh] md:h-[260vh]` (`:91`) con consola/hero **pinned** (`sticky top-0` `:93`).
- `useScroll({target, offset:["start start","end end"]})` (`:81`) → `scrollYProgress` maneja todo.
- **Timestamp corriendo 00:00→03:00** atado al scroll: `useTransform` (`:87-88`), render como
  gigante tenue detrás del headline (`text-[15rem] opacity-[0.05]` `:108-110`) y en el header de consola.
- Transcript / extracciones / match / **payoff** se revelan por **rangos de scroll** vía
  `<ScrollStep from..to>` (`:51-77`); bajar avanza, subir rebobina (gratis con scrollYProgress).
- Solo `opacity`+`y` (transform). El medidor de audio pasó de animar `height` a **`scaleY`** (`:185-188`) → transform puro 60fps.

**Adenda integrada:**
- (1) Humanizada: `persona.ts` (Sofía Martínez / asesor Martín / Rosario · entrante), header `:165` + subheader; Sofía se reusa en match/payoff y queda disponible para las secciones.
- (2) **Payoff** al final de la secuencia (`:258-284`): `PERFIL COMPLETO ✓ / 12 analizadas / mejor match 97.0% / Propuesta lista →`.
- (3) Headline **3 líneas** (`:120-122`) + timestamp gigante detrás.
- (4) Consola más protagonista: grid `lg:grid-cols-[0.95fr_1.05fr]`, panel más contrastado (`bg-[oklch(0.185_0_0)]`), padding/tipografía subidos.
- CTA secundaria → **`[ Ver la llamada ]`** (`:143`).

**W2 — Decode terminal (`decode-text.tsx`, `:25`):**
- Scramble de glyphs que resuelve al texto real, izq→der, con `requestAnimationFrame` (transform/contenido, no layout).
- A11y: texto real en `sr-only`, scramble `aria-hidden` (`:79-80`). SSR renderiza el texto real (sin CLS ni mismatch).
- Aplicado al **H1** (mount, stagger por línea `:120-122`) y a los **headings de sección** on-view (`sections.tsx:96`, `:254-255`).

**Verificaciones:**
- ✅ `npm run typecheck` → exit 0.
- ✅ **0 warnings** de React por render SSR (todos los `motion.*`/`ScrollStep` con 0-1 hijo).
- ✅ `/` → 200; SSR trae "La llamada termina", "Sofía Martínez", "Perfil completo", "Propuesta lista", "Ver la llamada".
- ✅ **Cero ámbar** (token/color/palabra) en código y SSR. Reduced-motion: pin se desactiva, pasos visibles fijos, timestamp fijo.
- ✅ Sin errores de hidratación en el log.

**⚠️ Pendientes / decisiones para tu revisión:**
1. **Sin verificación visual** (crítico acá): el scrollytelling es 100% scroll/visual y la extensión
   de Chrome sigue desconectada. Verifiqué estructura + SSR + 0 warnings + typecheck, pero **NO vi
   correr el pin, el timestamp ni los reveals**. Necesito ojo humano/browser sí o sí en este.
2. **Mobile**: en <lg la consola + headline apilados dentro de un pin `min-h-dvh` pueden **clippear**
   (mucho contenido vertical). Reduje el pin a 150vh y oculté el timestamp gigante en mobile, pero
   el ajuste fino de que entre todo en pantalla necesita verse en 390px.
3. **"Loop 9s como fallback"**: lo **reemplacé** por el scroll-driving (durante el pin el scroll ES
   el reloj). Como la consola se va de pantalla al terminar el pin, un loop posterior no aporta.
   ¿Confirmás que va así, o querés el loop corriendo cuando el hero está quieto/visible?

Ideas creativas volcadas en `docs/ideas-ejecutor.md` (12 propuestas con esfuerzo estimado).
Freno acá según lo pedido y espero tu revisión antes de W3–W5.

### Revisión checkpoint 1 + recalibración "aura inmobiliaria" (orquestador)

- **W1 scrollytelling: APROBADO** (pin + timestamp scroll-driven + payoff + Sofía; 0 warnings,
  reduced-motion OK). Pendiente verificación visual (ningún browser conectado — queda para el humano).
- **W2 decode: ELIMINADO por feedback del humano** ("muy cibernético; tiene que tener aura de
  inmobiliaria"). Reemplazo: reveal editorial por líneas (máscara + translateY, stagger).
- **Recalibración de dirección:** mono/terminal SOLO dentro de la consola de la demo (interfaz del
  producto); headlines/secciones/marca → editorial premium inmobiliario. W5 boot reformulado como
  "llamada entrante · Sofía Martínez ▼ atender" (1s, elegante, sin deps técnicas).
- **Decisiones:** loop→scroll aprobado con estado vivo en progress 0 + "▼ Atender la llamada"
  (scrollear = atender). Ideas del ejecutor: aprobadas rail de llamada, typing ▊ en transcript,
  ⟲ REW, reloj footer; rechazadas scanlines y boot-deps (cibernéticas); M/L a stretch post-E5.
- Delegado: fix decode + W3–W5 reformulado + 4 ideas aprobadas → "E3-WOW checkpoint 2".

### E-APP planificado (orquestador) — migración UI de /app

- Pedido de Julian: animar/migrar la UI del asistente. Auditoría hecha de `agent-chat.tsx` y
  `agent-message.tsx`. Spec completa en `docs/app-ui-plan.md`.
- Idea fuerza: /app ES la consola del hero hecha producto (continuidad landing → asistente).
  Solo capa visual; la lógica eve no se toca. Hallazgos: tema light por defecto (≠ landing),
  yellow-500 en InputRequestActions (color vetado), radios mixtos, tool-calls sin estados vivos.
- Roadmap actualizado: E3-WOW cp2 → **E-APP** → E3b → E4 → E5.
- ⚠️ Coordinación: fable.md asigna "producto" al otro equipo; E-APP es solo presentación y a
  pedido del humano — avisar al equipo antes de mergear.

### Ajuste de narrativa: la demo = /app real (humano → orquestador → ejecutor)

- Julian: "guiate en lo que hay en /app; en la landing tenemos que mostrar un poco de lo que se
  hace ahí". La demo del hero deja de ser una llamada en vivo y pasa a ser una **sesión real del
  asistente**: consulta del asesor → perfil → tool call `kiteprop.search` visible → ranking →
  "Propuesta enviada a Sofía ✓". Reloj 00:00→00:47 (métrica <1 min). Headline no cambia (la
  llamada termina → la consulta entra a Kigent → propuesta lista). Escucha en vivo queda como
  visión, no como demo. Guion actualizado; brief enviado al ejecutor antes del checkpoint 2.
- Bonus de coherencia: la demo del hero y E-APP convergen — misma consola en landing y producto.

### Prioridad máxima (humano): eliminar decode/scramble YA

- Julian reporta que el efecto de letras revueltas en títulos SIGUE visible y le molesta mucho
  (segunda vez que se pide). Orden al ejecutor con prioridad sobre todo: eliminarlo de H1 +
  headings, borrar decode-text.tsx, usar reveal editorial en todos los títulos, verificar con
  grep, confirmar en pasos.md de inmediato.

- **[FIX urgente] Efecto scramble/decode ELIMINADO** de H1 y de todos los headings de sección; `decode-text.tsx` borrado del árbol (grep sin rastros). Reemplazado por `LineReveal` (máscara + translateY, ease [0.16,1,0.3,1]). Typecheck verde.

### E3-WOW checkpoint 2 — reporte ejecutor (term_95462549)

**Estado: W3 + W4 + W5 + 4 ideas + fix decode + recalibración editorial + narrativa producto = COMPLETO.**
Verificado: typecheck exit 0 · **0 warnings** · sin errores de hidratación · `/` → 200 · **cero ámbar**.

**FIX crítico (decode):** eliminado de H1 y de TODOS los headings; `decode-text.tsx` borrado (grep sin rastros).
Reemplazo `LineReveal` (`reveal.tsx`): máscara `overflow-hidden` + `translateY 110%→0`, ease `[0.16,1,0.3,1]`,
stagger por línea. Reduced-motion → fade. Usado en H1 (`hero.tsx`), `SectionHeading` y CTA final (`sections.tsx`).

**(B) Recalibración editorial:** lo mono/terminal vive SOLO en la consola del hero. Headline, eyebrow,
párrafo y botones pasan a `font-sans` premium; marquee y stats en sans.

**Narrativa = producto real de /app** (leí `agent-chat.tsx`): la consola ya no es una llamada inventada.
Secuencia scroll-driven: (1) consulta del asesor `>martín: Sofía busca depto 2 dorm…` (2) Kigent extrae
perfil (chips) (3) **tool-call visible** `kiteprop.search · buscando… → 12 resultados ✓` (crossfade por scroll,
`SearchToolCall`) (4) ranking (match 97%) (5) payoff `Propuesta enviada a Sofía ✓ · por email`. **Reloj 00:00→00:47**
(refuerza <1 min). Indicador `▼ Ver la consulta`. Header `Kigent · asistente / Asesor: Martín · CRM: KiteProp`.
La escucha de llamada en vivo queda para inferencias (no acá). Headline sin cambios.

**W3 — Waveform reactiva** (`waveform.tsx`): 44 barras full-width detrás del hero; respira suave (scaleY infinito)
y su amplitud (scaleY del contenedor) responde a `useVelocity(scrollY)` suavizado con `useSpring`. Solo transform.

**W4:**
- **Marquee** (`marquee.tsx`): 16 señales del producto en cinta infinita (translateX, loop seamless x2). Puente hero→sección.
- **Contadores** (`stats.tsx`): `<1 min · 97% · 15+ · 0` con `animate(spring)` al entrar en viewport (`useMotionValue`+`useTransform`).
- **CTA magnético** (`magnetic.tsx`): el botón sigue al puntero (`useMotionValue`+`useSpring`, solo x/y) y vuelve; aplicado al CTA primario del hero.

**W5 — Llamada entrante** (`incoming-call.tsx`): preloader de 1ª visita (`sessionStorage`), ~1.1s, elegante
(`Llamada entrante · Sofía Martínez · ▼ Atender`), corte suave. NADA de boot técnico. Reduced-motion: más corto.

**4 ideas aprobadas:**
- Rail de progreso de llamada (`hero.tsx`, línea vertical con fill `scaleY: scrollYProgress`).
- Cursor ▊ de prompt vivo en la consola (`> esperando consulta ▊`, blink duro).
- Afordance `⟲ rew` al rebobinar (`useVelocity` negativa → opacity con spring, sin re-render).
- Reloj real en el footer (`LiveClock`, hora local, placeholder SSR sin mismatch).

**Reglas:** solo transform/opacity en lo animado; `useReducedMotion` degrada en todos los componentes; paleta emerald/zinc estricta.

**⚠️ Pendientes honestos (los mismos de siempre + nuevos por volumen):**
1. **Sin verificación visual** — la extensión de Chrome sigue caída. Esto es CRÍTICO acá: waveform reactiva,
   magnético, marquee, pin, contadores, preloader son 100% visuales/interactivos. Verifiqué estructura + SSR +
   typecheck + 0 warnings, pero **no vi nada corriendo**. Necesita ojo con browser sí o sí.
2. **Mobile**: mismo riesgo de clipping del pin en <lg; guards puestos, ajuste fino pendiente de browser.
3. **Coherencia**: las secciones (HowItWorks/Matching/Inferences/Benefits) siguen zinc+emerald sin retheme (E3b);
   contrastan con hero/nav/stats/footer nuevos. Estado intermedio previsto.

### Cambio de prioridad: E-APP con dictado por voz (humano → orquestador → ejecutor)

- Julian: "/app es ahora todo" + feature nueva: micrófono en el chat que graba y transcribe en
  vivo (como el dictado de ChatGPT/Claude). Spec agregada a docs/app-ui-plan.md: Web Speech API
  (es-AR, continuous, interim al textarea), estados de grabación, fallbacks.
- Orden al ejecutor: cerrar W3-W5 coherente (checkpoint 2 corto) → E-APP: mic PRIMERO, después
  tema consola/motion/fixes de color. E3b/E4/E5 de landing quedan detrás de E-APP en el roadmap.

### Checkpoint 2 revisado (orquestador): E3-WOW APROBADO

- Todo el alcance completo y verificado (typecheck 0 / warnings 0 / sin ámbar / narrativa =
  producto real de /app). Pendiente único: verificación visual humana (browsers desconectados).
- Orden: commit del estado landing antes de E-APP (diffs separados). E-APP en curso (mic primero).

### Copy: "CRM" → "KiteProp" en todo (humano)

- Pedido de Julian. 7 ubicaciones detectadas por grep (hero, sections, metadata) enviadas al
  ejecutor con la línea exacta; gramática adaptada, no reemplazo ciego.

### E-APP checkpoint 1 — reporte ejecutor (term_95462549)

**Estado: dictado por voz + tema dark base = COMPLETO.** Lógica eve intacta.
Verificado: typecheck exit 0 · **0 warnings** · `/app` → 200 dark · `/` → 200 · sin errores nuevos.

**0. Dictado por voz (prioridad):** `app/_components/mic-button.tsx` (nuevo).
- Web Speech API del browser (`SpeechRecognition`/`webkitSpeechRecognition`), `lang es-AR`, `continuous`,
  `interimResults`. Tipado mínimo local (webkit no está en lib.dom).
- Escribe el transcript **en vivo** en el textarea vía `usePromptInputController().textInput.setInput()`.
  Para eso envolví el composer en `<PromptInputProvider>` (mínima intervención, **sin tocar** ai-elements):
  con provider el textarea queda controlado y el submit ya lee/limpia `controller.textInput` (verificado en el código).
- Al frenar, el texto queda editable y se envía normal. Estado visible: dot emerald pulsante + "escuchando…"
  arriba del composer (`agent-chat.tsx`, lifted state `micState`).
- Fallbacks: sin soporte → botón oculto (`return null`); permiso denegado → mensaje claro.

**1. Tema dark consola en `/app`:** `app/app/page.tsx` envuelve `AgentChat` en un wrapper que remapea los
tokens shadcn a la paleta de la landing (near-black `0.145 0 0` + emerald `0.77 0.15 165`, `--radius: 3px`),
`color-scheme: dark`, scopeado (no toca el tema del resto del sitio). El chat existente hereda el dark sin cambios de lógica.

**6 (parcial). Colores vetados:** `agent-message.tsx` — `yellow-500` (VETADO) → emerald en InputRequest;
`blue-500` (auth pendiente) → neutral (`border-border`/`bg-muted`). Radios: el token `--radius: 3px` achica los `rounded-*`.

**Copy CRM → KiteProp:** aplicado en `page.tsx`, `hero.tsx` (párrafo + header), `sections.tsx` (x4), gramática natural.
Grep: no queda "CRM" visible (solo un comentario en `hero.tsx`).

**Chat sigue igual:** examples (`sendExample` va directo a `agent.send`), cancelar (`onStop`) y submit intactos;
el provider solo cambia de dónde sale el value del textarea (verificado: submit usa `controller.textInput.value`).

**⚠️ Pendientes honestos:**
1. **Mic sin probar en vivo:** la Web Speech API es browser-only y la extensión de Chrome sigue caída, así que
   **no pude dictar de verdad** (permisos, interim, es-AR). Verifiqué estructura + typecheck + SSR + 0 warnings.
   Necesita prueba humana con micrófono (y es Chrome/Safari; Firefox no soporta SR).
2. **Send real sin keys:** sin `AI_GATEWAY_API_KEY` el agente no responde; verifiqué empty state + que la lógica no se tocó.
3. **Layout del botón mic** dentro del InputGroup: quedó como hermano del submit; sin browser no confirmé el alineado fino.
4. Falta el resto de E-APP (header KIGENT_, empty state con fichas, mensajes con motion, tool-calls vivos, error state) → próximos pasos.

### E-APP v2: modo llamada (humano → orquestador → ejecutor)

- A Julian le gustó el rumbo del mic y evolucionó el pedido: fingir una charla telefónica
  (altavoz) donde Kigent escucha a asesor Y cliente — como la animación del hero — y al cortar
  el agente procesa todo (perfil → KiteProp → propuesta). Spec en app-ui-plan.md ('MODO LLAMADA').
- Diseño: UI de llamada calcada de la consola del hero (timer, waveform, transcript vivo);
  transcript se envía enmarcado al agente al cortar; roles inferidos por el LLM (Web Speech API
  no diariza). Continuidad landing→producto: es LA demo de la hackatón.

### E-APP v3: demo guionada (humano → orquestador → ejecutor)

- Julian para el MVP: "fingí que el agente le responde como si fuera otra persona". Doble
  simulación integrada al modo llamada: (A) durante la llamada, el cliente (Sofía) responde
  solo con líneas guionadas al detectar pausa del asesor — demo sin actuar dos voces; (B) al
  cortar, si no hay keys la respuesta del agente es simulada con streaming (perfil → búsqueda
  KiteProp visual → ranking → propuesta enviada), tono humano. Marcado como DEMO_MODE apagable;
  el chat de texto normal sigue con send real.

### Referencia visual para /app (captura del humano)

- Julian mandó captura de la consola del hero como objetivo: /app (al abrir y en modo llamada)
  debe verse casi idéntico. Orden al ejecutor: extraer el chrome de la consola a un componente
  compartido (console-shell) usado por hero y /app — paridad exacta sin duplicación; empty
  state "> esperando consulta", timer, waveform y transcript dentro del mismo marco.

### E-APP checkpoint 2 — reporte ejecutor (term_95462549)

**Estado: MODO LLAMADA + demo guionado + paridad ConsoleShell = COMPLETO.**
Verificado: typecheck exit 0 · **0 warnings** · `/app` y `/` → 200 · panel consola en SSR de /app · sin errores/hidratación.
Lógica eve intacta; chat de texto normal sin tocar.

**Paridad hero ↔ /app (`console-shell.tsx`, nuevo):** extraje el chrome de la consola (border 1px + header
[dot ■ · título mono · timer emerald] + subheader [Asesor / KiteProp] + body) a `ConsoleShell` y lo uso en
AMBOS lados. **Refactoricé el hero** para usarlo (SSR verificado, scrollytelling intacto). En `/app` el empty
state ES ese panel: `Kigent · asistente` / `esperando consulta ▊` / `Asesor: Martín · KiteProp` / timer `00:00`,
ejemplos como fichas `> …` + botón `Iniciar llamada`.

**MODO LLAMADA (`call-mode.tsx`, nuevo):** overlay calcado de la consola (ConsoleShell + timer corriendo +
waveform viva + transcript en vivo). SpeechRecognition `es-AR continuous interimResults`; finales apilados +
interim; auto-restart en `onend` (algunos browsers cortan por silencio). Botones `Cancelar` / `Cortar llamada`.

**Contraparte guionada (A):** cada pausa del asesor (~2s de silencio, `armSilence`) dispara la próxima línea de
Sofía del `CLIENT_SCRIPT` (6 líneas del guion), con typing ▊ breve antes. Secuencial, sin NLP. Así el humano
demuestra la llamada sin actuar dos voces.

**Respuesta simulada (B) (`demo-response.tsx`, nuevo):** al cortar, si `DEMO_MODE` (const, sin keys) la
respuesta del agente se reproduce guionada con streaming (typing char-a-char, tono de colega): resumen del
perfil → tool-call `kiteprop.search · buscando… → 12 propiedades ✓` (~2s) → ranking (Pellegrini 97%…) →
`Le mandé la propuesta a Sofía por mail ✓`. Se apaga poniendo `DEMO_MODE = false` cuando conecten keys;
en ese caso hace el `agent.send` real con el mensaje enmarcado. El chat de texto normal siempre intenta el send real.

**Dictado corto (v1) sigue:** botón mic en el composer (refactor a `speech.ts` compartido). Tema dark base ya estaba.

**Colores vetados** ya corregidos (yellow-500→emerald, blue-500→neutral); radios vía `--radius: 3px`.

**⚠️ Pendientes honestos (importante):**
1. **NADA de esto está probado en vivo** — la extensión de Chrome sigue caída y todo el modo llamada es
   micrófono + browser puro. Verifiqué typecheck + 0 warnings + SSR + estructura, pero **no escuché la captura,
   ni vi el guion de Sofía dispararse en las pausas, ni el streaming de la respuesta simulada**. Necesita prueba
   humana con micrófono (Chrome/Safari) sí o sí. Es lo más crítico de todo lo que hice.
2. **Send real** requiere keys (DEMO_MODE cubre la demo mientras tanto).
3. **Layout de los 3 botones** (mic + teléfono + submit) en el InputGroup: sin browser no confirmé el alineado.
4. Falta el resto del plan E-APP (mensajes reales con motion, tool-calls reales como consola, error state, reasoning) → próximos pasos.

### Checkpoint 2 de E-APP revisado (orquestador): APROBADO

- Modo llamada completo (ConsoleShell compartido, overlay con timer/waveform/transcript, Sofía
  guionada por pausas, respuesta simulada con streaming, DEMO_MODE apagable). Typecheck 0 /
  warnings 0 / eve intacto. ⚠️ CRÍTICO pendiente: prueba humana con micrófono real en Chrome —
  nadie escuchó la captura en vivo aún (browsers de ambas sesiones caídos).
- Orden: commit de E-APP → resto del plan (mensajes con motion, tool-calls reales estilo
  consola, error state, reasoning) → E4 landing (favicon/OG/selection/scrollbar/focus).

### E-MERGE: adaptación a los cambios del equipo (humano → orquestador → ejecutor)

- Cambio de planes de Julian: SanchezMaximo pusheó 621fd1b — dictado con ElevenLabs Scribe v2
  Realtime (hook use-dictation + dictation-button + /api/scribe-token + deps). Su motor pasa a
  ser la base; nuestra UI (ConsoleShell, modo llamada, demo guionada, tema) se remonta encima.
- Resguardo hecho por el orquestador: WIP commiteado (21e2bd2) + branch backup/kigent-ui-fable.
- Plan delegado: merge de origin/main (conflicto esperado solo en agent-chat.tsx), mic-button
  nuestro se borra, speech.ts queda como fallback del modo llamada sin key, call-mode se
  recablea a useDictation (Scribe primero), restyle del dictation-button al look consola.
- ⚠️ Para dictado real hace falta ELEVENLABS_API_KEY en .env.local (pedírsela a Maximo);
  sin key el dictado se deshabilita solo (503) y la demo guionada sigue andando.

### E-MERGE — reporte ejecutor (term_95462549)

**Estado: merge de origin/main (Scribe del compañero) + nuestra UI remontada = COMPLETO.**
Verificado: typecheck exit 0 · **0 warnings** · `/app` y `/` → 200 · `npm install` OK (había red).

**Merge:** `git merge origin/main` (621fd1b, dictado con ElevenLabs Scribe). Conflicto **solo en
`agent-chat.tsx`** (como se esperaba); `package.json`/`package-lock.json` los cambiaron solo ellos → auto.

**Resolución del conflicto (agent-chat.tsx), integrando AMBOS:**
- Imports: nuestros (CallMode/ConsoleShell/CallDemoResponse/PERSONA) + su `DictationButton`. Saqué
  `MicButton`/`isSpeechSupported`/`InputGroupButton`/`useEffect` (ya no usados).
- Estado: saqué `micState`/`speechSupported`; mantuve `callOpen`/`demoActive`; sumé su
  `stopDictationRef`/`dictationError`.
- `errorMessage`: combinado → `cancellationError ?? agent.error?.message ?? dictationError`.
- Composer: **su `DictationButton`** (textarea `pr-22`) + submit. Su `handleSubmit` corta el mic al enviar (mergeó solo).
- Error state: **nuestro estilo consola** (border recto, mono, cuadradito) + **su título condicional** (dictado vs pedido).
- Disparo del modo llamada: botón en el **header** (`▸ Llamada`) cuando hay conversación, y `Iniciar llamada` en el empty state (ambos abren `CallMode`). Evita chocar con su botón absoluto del composer.

**Tarea 2 — mic-button borrado** (`git rm`); **`speech.ts` conservado** como fallback de voz del modo llamada.

**Tarea 3 — rewire de call-mode.tsx:** ahora usa **`useDictation(dictated, setDictated)` (Scribe) como motor
primario**; si Scribe falla (503 sin `ELEVENLABS_API_KEY`, `dictation.error` + no recording), **cae a Web Speech**
(`speech.ts`) que escribe en el mismo `dictated`. Modelo value-based: `dictated` crece, `committed` marca el
límite ya volcado a líneas, `liveTail` = lo nuevo; en cada pausa (2s) se commitea la línea del asesor y responde
el guion de Sofía. La demo de voz **no puede morir** por falta de key. Subheader muestra el motor activo (Scribe/voz).

**Tarea 4 — restyle de dictation-button.tsx:** al look consola (rectos `rounded-none`, estado grabando en
**emerald** en vez de destructive). **Lógica intacta** (useDictation/toggle/stop/estados sin tocar).

**Tarea 5 — `npm install`:** corrió con **exit 0** (el sandbox tenía red); `@elevenlabs/react` instalado.

**⚠️ Pendientes honestos:**
1. **Sin prueba de voz en vivo** — Scribe (requiere key + red del browser) y Web Speech son 100% browser + micrófono;
   la extensión sigue caída. Verifiqué typecheck + 0 warnings + SSR + resolución del merge, pero **no dicté ni corrí
   una llamada real**. El rewire sigue el contrato del hook; queda prueba humana (dictado corto, y modo llamada con y sin key).
2. **Layout del `DictationButton`** (absoluto `right-12`) + submit: sin browser no confirmé el alineado fino con el restyle.
3. **Demo guionada (DEMO_MODE)** sigue igual: al cortar la llamada, respuesta simulada; verificado estructuralmente.
