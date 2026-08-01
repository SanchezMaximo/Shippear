# Pasos hackatón — Kigent / AI Property Match

## 2026-08-01

- **Reestructura de rutas.** Se liberó el home `/` para la landing y se movió la experiencia del
  asistente a `/app`.
  - `app/app/page.tsx` → renderiza `AgentChat` (título "Kigent — Asistente").
  - `app/page.tsx` → nueva **landing** de AI Property Match (hero + CTA "Probar el asistente" → `/app`).
  - Verificado en dev: `/` y `/app` responden HTTP 200 en http://localhost:3000.
- Entorno: `source ~/.nvm/nvm.sh` (node v24.18.1), front con `npm run web`.
- Pendiente: construir la landing completa (nivel Awwwards) sobre el hero base.
