# Agente Inmobiliario · KiteProp (Next.js)

Versión Next.js (App Router) del agente: chat en streaming, dashboard y buscador de propiedades, integrado directo con el [MCP de KiteProp](https://mcp.kiteprop.com), para el equipo interno de una inmobiliaria.

## Cómo funciona

- Los **route handlers** (`src/app/api/**/route.js`) son los únicos que conocen las API keys (via `process.env`, del lado del servidor). Nunca se exponen al navegador.
- Usan el **MCP Connector de la API de Claude**: se le pasa a Claude la URL del MCP de KiteProp (`mcp_servers`) y Claude decide qué herramientas llamar según el pedido del usuario, las ejecuta contra KiteProp y devuelve el resultado, todo en la misma llamada. No hay ningún nombre de herramienta "hardcodeado": Claude descubre las 24 herramientas de KiteProp en tiempo real.
- `/api/chat` devuelve el stream (SSE) de Claude directo como `Response` — Next.js soporta pasar un `ReadableStream` de `fetch` como body de salida sin copiarlo a mano.
- `/api/dashboard` y `/api/properties/search` hacen una llamada no-streaming, forzando (via prompt) el uso de ciertas herramientas, y devuelven los resultados ya parseados.
- El **frontend** son 3 vistas (componentes de cliente en `src/components`):
  - **Chat**: streaming con "chips" que muestran qué herramienta de KiteProp se está usando en cada momento, y tarjetas de propiedades inline cuando corresponde.
  - **Dashboard**: `get_dashboard_stats`, `get_message_stats`, `get_agent_stats`, `get_property_performance`, renderizados en tarjetas/tablas.
  - **Propiedades**: buscador en lenguaje natural sobre `search_properties`.
- El renderizado de resultados (`src/lib/render.js`) es **genérico**: como KiteProp no publica el JSON Schema exacto de cada herramienta, se detecta automáticamente si un resultado es una lista de propiedades, una tabla o estadísticas simples, sin asumir nombres de campo exactos.

## Requisitos

- Node.js 18.17 o superior
- Una API key de KiteProp (`KiteProp → Configuración → API Keys`)
- Una API key de la API de Claude ([platform.claude.com](https://platform.claude.com))

## Instalación

```bash
cd kiteprop-agent-next
npm install
cp .env.example .env.local
```

Completá `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
KITEPROP_API_KEY=kp_...
AGENCY_NAME=Nombre de tu inmobiliaria
```

Next.js carga `.env.local` automáticamente, no hace falta `dotenv`.

## Desarrollo

```bash
npm run dev
```

Abrí `http://localhost:3000`.

## Producción

```bash
npm run build
npm start
```

## Desplegar

Al ser Next.js, es "deploy nativo" en [Vercel](https://vercel.com): importás el repo, cargás las mismas variables de entorno (`ANTHROPIC_API_KEY`, `KITEPROP_API_KEY`, `AGENCY_NAME`, opcionalmente `CLAUDE_MODEL` y `KITEPROP_MCP_URL`) en el panel del proyecto, y listo. También corre en cualquier hosting Node 18+ (`npm run build && npm start`) — Render, Railway, un VPS, etc.

Recomendación de seguridad: si vas a exponer la app a internet, agregá autenticación delante de la app (por ejemplo con `next-auth` o el SSO de tu empresa), ya que hoy cualquiera con la URL puede usar el agente (y por lo tanto leer/modificar datos de KiteProp) sin login propio.

## Comportamiento del agente

El system prompt vive en `src/lib/claude.js` (función `systemPrompt`). Le indica al agente que:

- Responda en español, de forma breve y profesional.
- Use las herramientas de KiteProp para cualquier dato real (nunca inventa números).
- Pida confirmación antes de ejecutar acciones que modifican datos (cambiar estado de una propiedad, crear un contacto, registrar un mensaje, cargar un feedback), salvo que el pedido ya haya sido explícito.

## Estructura

```
kiteprop-agent-next/
  src/
    app/
      layout.js
      page.js               # arma Sidebar + las 3 vistas
      globals.css
      api/
        chat/route.js               # POST, streaming SSE
        dashboard/route.js          # GET
        properties/search/route.js  # POST
        config/route.js             # GET
        health/route.js             # GET
    components/
      Sidebar.js
      ChatView.js
      DashboardView.js
      PropertiesView.js
    lib/
      claude.js       # llamadas a la API de Claude + MCP connector (server-only)
      render.js        # renderer genérico de resultados (HTML strings)
      toolLabels.js     # nombres/íconos legibles por herramienta
  .env.example
```
