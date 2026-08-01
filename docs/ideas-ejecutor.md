# Ideas del ejecutor (para evaluación del orquestador)

Propuestas creativas mías que NO están en el brief. Una línea + esfuerzo estimado (XS/S/M/L).
El orquestador evalúa e integra al roadmap lo que sume.

## Refuerzan el concepto "consola / la llamada"
- **Rail de progreso de llamada** — timeline vertical fina al costado con ticks 00:00→03:00 que se llena al scrollear; navegación conceptual. `S`
- **Deep-link por timestamp** — cada sección con anchor tipo `#0241`; se puede compartir "el momento" de la llamada. `S`
- **Cursor de typing por línea** — cada línea del transcript "se tipea" con cursor `▊` al imprimirse (no solo fade). `S`
- **Afordance de rebobinado** — al scrollear hacia arriba, micro-indicador `⟲ REW` que refuerza que estás rebobinando la llamada. `S`
- **Reloj real en el footer** — status "consola activa" con la hora real del visitante (`HH:MM:SS`). `XS`

## Interactivo (más wow, más riesgo)
- **Inferencias jugables** — input donde el visitante escribe una frase del cliente y ve las señales inferidas en vivo (mini-demo del producto). `L`
- **Demo con teclado** — flechas ↑/↓ avanzan/rebobinan la llamada además del scroll (a11y + juguetón). `M`
- **Toggle "con Kigent / sin Kigent"** — split que muestra el tiempo administrativo ahorrado. `M`

## Detalle / textura
- **Boot con deps reales** — la boot sequence (W5) lista dependencias tipo `next ✓ / motion ✓ / crm ✓` para credibilidad técnica. `XS`
- **Payoff compartible** — la tarjeta de payoff ("Propuesta lista") con botón "copiar propuesta" que genera un texto tipo OG. `M`
- **Scanlines CRT opcionales** — modo retro-terminal detrás de un toggle discreto (respetando reduced-motion). `S`

## Notas
- Todo lo de arriba respeta la paleta emerald/zinc y la regla 60fps (transform/opacity).
- Las de esfuerzo `L`/`M` interactivas son las de mayor impacto para un jurado, pero comen tiempo de hackatón — decisión del orquestador.
