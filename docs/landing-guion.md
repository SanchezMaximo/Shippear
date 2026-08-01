# Guion de la landing — "Consola de la llamada" (dirección del orquestador)

> Este documento es la especificación creativa para E3b y E4. La diferencia entre una landing
> "bien hecha" y una que sorprende a un jurado no es el estilo: es que la página **cuenta una
> llamada de principio a fin**. El scroll es la llamada.

## Idea rectora

La landing entera es una sesión de Kigent. El visitante no lee secciones: **presencia una
llamada de 3 minutos** que avanza a medida que scrollea. Cada sección es un momento de la
llamada, con su timestamp. Al final, la propuesta salió y el cliente contestó.

## Estructura (en orden de scroll)

### 0. Boot (preloader, ~1.2s, solo primera visita)
Pantalla tinta. `KIGENT_` con cursor parpadeando. Tres líneas de boot en mono:
`conectando CRM… ✓` / `micrófono listo ✓` / `esperando llamada…`. Corte a hero.
(Si complica, degradar a: el hero "bootea" al montar.)

### 1. Hero — `00:00` La llamada entra
Lo que ya existe (consola con transcript + extracción en vivo + loop 9s), con un agregado:
un **timestamp grande corriendo** (00:00 → 02:47) que ancla el concepto. Headline actual se
mantiene ("La llamada termina. / La propuesta ya está lista.").

### 2. Marquee — señales que Kigent detecta
Cinta corriendo en mono, separada por `·`: operación · tipo · zona · presupuesto · dormitorios ·
cochera · balcón · patio · terraza · apto crédito · financiación · fecha de compra · motivo ·
prioridades · restricciones · urgencia. (15+ señales reales de problematica.md — es el inventario
del producto convertido en textura visual.)

### 3. `00:41` — Cómo funciona (3 momentos, no 3 cards)
Numerados como log: `00:41 ESCUCHA` / `01:15 ESTRUCTURA` / `02:47 MATCHEA`. Layout asimétrico,
línea de tiempo vertical fina conectándolos. Copy actual reformateado.

### 4. `02:48` — Matching como tabla real
Tabla de verdad (no cards): columnas `#`, `PROPIEDAD`, `SEÑALES`, `COMPAT`. Filas Pellegrini
1450 / Córdoba 980 / Rioja 1200. Hover en fila → expande "por qué" (los ✓/✗). Barras de
compatibilidad rectas, emerald.

### 5. `02:52` — Lo que no se dice (inferencias)
Formato entrada→salida de log:
`>cliente: "tengo dos hijos"` → `inferido: colegios ✓ espacios verdes ✓ seguridad ✓ superficie ✓`.
Dos bloques. Es la sección más "wow" conceptual: mantenerla escueta, que respire.

### 6. Números gigantes (nuevo)
Cuatro stats en mono XL, contadores animados al entrar en viewport:
`<1 min` propuesta lista · `97%` mejor match · `15+` señales por llamada · `0` formularios.

### 7. `02:59` — Beneficios
Lista con separadores finos (no grid de cards). Seis items actuales.

### 8. `03:00` — CTA final como prompt
La llamada terminó. Línea de consola grande: `$ kigent iniciar-demo █` como botón real → `/app`.
Sub: "Probalo con una consulta real de tu inmobiliaria."

### 9. Footer
`KIGENT_ · AI Property Match · hecho en hackatón 2026`. Mini fila de "status": `CRM conectado ✓ ·
consola activa ✓`.

## Reglas transversales

- **La demo muestra el producto REAL (regla del humano):** la consola del hero es una **sesión
  de /app**, no una llamada inventada. Guiarse por `app/_components/agent-chat.tsx` y el flujo
  real: el asesor escribe la consulta del cliente → Kigent extrae el perfil → tool call visible
  al CRM de KiteProp (como las tool calls de /app) → ranking → **propuesta enviada por email ✓**.
  La secuencia scroll-driven pasa a ser: consulta de Martín (sobre Sofía) → perfil → búsqueda
  CRM (`kiteprop.search · 12 resultados ✓`) → matching → payoff "Propuesta enviada a Sofía ✓".
  El reloj de la demo corre **00:00 → 00:47** ("de consulta a propuesta en menos de un minuto"
  — refuerza la métrica <1 min). La escucha de llamadas en vivo queda como visión (sección de
  inferencias / "próximamente"), no como demo.
- **Aura inmobiliaria, no hacker (regla maestra, del humano):** la estética terminal/mono vive
  SOLO dentro de la consola de la demo (es la interfaz del producto). Headlines, secciones y
  marca son editoriales premium: elegantes, humanos, de inmobiliaria. Prohibido: scramble/decode
  de caracteres, scanlines, boot técnico con deps. El arranque es una "consulta entrante" de
  Sofía. Reveals de texto: máscara + translateY por líneas, nunca efectos de caracteres.

- Timestamps como sistema de navegación conceptual: cada sección lleva el suyo.
- `::selection` emerald sobre tinta; scrollbar fina custom; focus visible emerald (a11y).
- Nada de: gradientes en texto, glows, blur, rounded-full, ámbar/amarillos (decisión del humano: paleta emerald + tinta neutra).
- Motion: entradas secas y rápidas (0.3–0.45s), sin bounce; los datos "aparecen" como logs,
  no flotan.
- Favicon `app/icon.svg`: "K_" emerald sobre tinta, rectos. OG image con el mismo sistema
  (headline + fila de match 97%).

## Adenda — crítica visual integrada (revisión externa, aprobada por el orquestador)

De una segunda revisión (Codex sobre captura real del hero). Se incorpora al canon:

1. **Humanizar la llamada.** La demo deja de ser anónima: header de consola con
   `LLAMADA · SOFÍA MARTÍNEZ` / `Asesor: Martín` / `Rosario · entrante`. Los personajes
   persisten en toda la página (el matching es "para Sofía", la propuesta se le envía a ella).
   Una demo técnica se vuelve una historia.
2. **Momento de payoff.** Al completarse la secuencia (scroll o loop), la consola cambia de
   estado visiblemente: `PERFIL COMPLETO ✓` / `12 propiedades analizadas` / `Mejor match: 97%` /
   `Propuesta lista →`. Hoy extrae datos pero no entrega recompensa.
3. **Headline con mejor corte** — "La llamada termina. / La propuesta / ya está lista." — y un
   **timestamp gigante muy tenue detrás** (`02:47`, ~15rem, opacity ~0.05).
4. **Consola más protagonista:** 15–20% más grande, más contraste contra el fondo.
5. **Sin vacíos entre folds:** el marquee de señales actúa de puente hero → sección `00:41`;
   la consola puede invadir parcialmente el fold siguiente.
6. **Fondo con capas sutiles:** grano + grid de líneas finas casi imperceptible + cambios de
   superficie entre secciones. Nunca glows.
7. **Detalles:** contraste del párrafo un punto arriba; hover states que cambian *texto/datos*,
   no solo color; CTA secundaria `[ VER LA LLAMADA ]` (en vez de "cómo funciona"); indicador de
   scroll discreto; marca "K_" más reconocible que un cuadrado.

## Orden de delegación

- **E3-WOW** (en curso): W1 scrollytelling pinned + W2 decode + W3 waveform + W4 marquee/
  contadores/CTA magnético + W5 boot. **La adenda 1–5 se integra a W1** (es el mismo bloque).
- **E3b**: secciones 2–5 + 7 del guion + adenda 6–7 (retheme + reestructura).
- **E4**: favicon, OG, selection/scrollbar/focus, microcopy final.
- **E5**: build verde, audit responsive/perf, push.
