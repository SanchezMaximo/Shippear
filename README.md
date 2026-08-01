# Kigent

Asistente para los corredores inmobiliarios que trabajan con **KiteProp**. El asesor le cuenta lo
que necesita su cliente, Kigent busca en el CRM, arma una propuesta con 3 a 5 opciones y —después
de que el asesor la aprueba— se la manda al cliente por email con un PDF adjunto.

El usuario es siempre el asesor, nunca el cliente final.

## Stack

| Pieza | Qué es |
| --- | --- |
| [eve](https://eve.dev/docs) | Framework del agente: tools, canal HTTP, sesiones durables, evals |
| Next.js 16 + React 19 | La UI de chat (`app/`) |
| AI Elements + shadcn/ui | Componentes del chat (`components/`) |
| KiteProp | CRM inmobiliario (fuente de toda propiedad). El agente lo consulta por su MCP |
| Resend | Envío del email con el PDF |
| pdf-lib | Render del PDF, sin dependencias nativas |

Modelo: `anthropic/claude-sonnet-5` vía el AI Gateway de Vercel (`agent/agent.ts`).

## Cómo arrancar

```bash
npm install
cp .env.example .env.local   # completá las variables, ver abajo
npm run dev                  # eve dev: agente + UI en http://localhost:3000
```

`npm run dev` levanta el agente y la app juntos. `npm run web` corre solo Next.js, útil si estás
tocando UI contra un agente ya levantado.

## Variables de entorno

Todas van en `.env.local` para desarrollo y en el proyecto de Vercel para producción. La plantilla
está en `.env.example`.

| Variable | Para qué |
| --- | --- |
| `AI_GATEWAY_API_KEY` | Acceso al modelo. En Vercel se inyecta solo; en local usá `vercel env pull` o un token de gateway |
| `KITEPROP_API_KEY` | API key personal de KiteProp (`kp_…`). El MCP la recibe como `X-API-Key`; el cliente REST, como `Authorization: Bearer` |
| `KITEPROP_API_URL` | Base de la API REST, sin barra final. Solo la usa `build_proposal` |
| `KITEPROP_MCP_URL` | Opcional. Default `https://mcp.kiteprop.com/mcp` |
| `RESEND_API_KEY` | Envío del email |
| `PROPOSAL_FROM_EMAIL` | Remitente con dominio verificado en Resend |

Sin `KITEPROP_API_KEY` el MCP responde 401, las búsquedas fallan con un mensaje explícito y el
agente le avisa al asesor en vez de inventar propiedades. Sin las de Resend, todo funciona menos el
último paso.

## Cómo está organizado

```
agent/                      Todo lo que define al agente (eve lo descubre por convención)
├── agent.ts                Modelo y configuración de runtime
├── instructions.md         System prompt: identidad, flujo de 5 pasos, reglas
├── channels/eve.ts         Canal HTTP y política de auth
├── connections/
│   └── kiteprop.ts         MCP de KiteProp, filtrado a las 20 tools de lectura
├── tools/                  Cada archivo es una tool; el nombre del archivo es su nombre
│   ├── build_proposal.ts
│   └── send_proposal_email.ts
└── lib/                    Código compartido, sin React ni nada de la UI
    ├── kiteprop.ts         Cliente REST + helpers de formato (solo build_proposal)
    ├── proposal.ts         Esquema Zod de la propuesta y enriquecimiento
    ├── proposal-store.ts   Propuestas aprobadas, por sesión (defineState)
    └── proposal-pdf.ts     Render del PDF

app/                        UI de Next.js
components/                 AI Elements y shadcn/ui
evals/                      Checks de comportamiento del agente
```

`agent/lib/` no importa nada de la UI a propósito: corre en el runtime serverless.

## El flujo, y por qué está armado así

1. `kiteprop__search_properties` — busca en el MCP de KiteProp. El agente puede llamarla varias
   veces aflojando criterios, y tiene que decir explícitamente qué relajó.
2. `kiteprop__get_property` — ficha completa de una propiedad puntual.
3. `build_proposal` — vuelve a consultar KiteProp para tener precios frescos, guarda la propuesta
   enriquecida y devuelve un **`proposalId`** más un resumen en markdown para que el asesor lo
   revise. No manda nada.
4. `send_proposal_email` — recibe **solo el `proposalId`** y el email del cliente. Está detrás de
   `approval: always()`, así que eve le pide confirmación explícita al asesor antes de ejecutarse.

El `proposalId` no es un detalle de implementación. Antes las dos tools recibían la propuesta
entera, y el modelo la regeneraba en la segunda llamada: costaba cientos de tokens de más y nada
garantizaba que lo enviado fuera lo aprobado. Ahora el contenido se lee tal cual quedó guardado
(`agent/lib/proposal-store.ts`, sobre `defineState` de eve, que es durable por sesión), así que el
cliente recibe exactamente lo que el asesor vio.

Si el asesor pide cambios, el agente vuelve a llamar a `build_proposal` y usa el ID nuevo.

## La conexión MCP de KiteProp

`agent/connections/kiteprop.ts` apunta a `https://mcp.kiteprop.com/mcp` (Streamable HTTP). Autentica
con el header `X-API-Key`, no con Bearer, así que la key va por `headers` y no por `auth`. El modelo
nunca ve la URL ni la credencial: descubre las tools con `connection_search` y las llama como
`kiteprop__<tool>`.

El servidor expone **24 tools; el agente sólo puede usar las 20 de lectura**. Las 4 de escritura
—`create_contact`, `create_message`, `create_visit_feedback`, `update_property_status`— quedan
afuera. Kigent consulta el CRM, no lo edita: una escritura accidental sobre el CRM de la
inmobiliaria es un daño real y difícil de revertir.

El límite se aplica en dos capas independientes:

1. **`tools.allow`** con las 20 de lectura. El modelo no ve las otras: no aparecen en
   `connection_search` ni gastan contexto.
2. **`approval`**, que deniega automáticamente cualquier tool cuyo nombre no empiece con un verbo de
   lectura (`search`, `get`, `list`, `compare`, …). No le pregunta al asesor: deniega y explica.

La capa 1 sola alcanzaría hoy, pero depende de que alguien mantenga la lista a mano cada vez que
KiteProp agrega tools. La capa 2 cubre ese hueco sin depender de nadie.

Además de propiedades, las 20 permitidas incluyen contactos y consultas de portales, estado de
publicación, métricas del negocio, análisis de precio por m² por zona y feedback de visitas.
`instructions.md` le dice al agente que las use cuando aporten a la recomendación, no por costumbre.

## Modo demo (sin credenciales de KiteProp)

Para mostrar el flujo completo sin API key del CRM, `KIGENT_DEMO=1` cambia la fuente de
propiedades: en vez de consultar el MCP, el agente genera propiedades **simuladas** con el mismo
modelo (`generateObject` del AI SDK contra el AI Gateway), en
[agent/lib/demo-catalog.ts](agent/lib/demo-catalog.ts).

```bash
KIGENT_DEMO=1 npm run dev
```

Qué cambia con el flag encendido:

| | Normal | Demo |
| --- | --- | --- |
| Búsqueda | `kiteprop__search_properties` (MCP) | `search_properties` (LLM) |
| Ficha | `kiteprop__get_property` (MCP) | `get_property` (catálogo de la sesión) |
| `build_proposal` | refresca precios contra REST | lee del catálogo de la sesión |
| Conexión MCP | 20 tools de lectura | `allow: []` + approval que deniega |
| `send_proposal_email` | manda vía Resend | **arma el PDF y devuelve éxito, sin enviar nada** |

Las propiedades se generan **una vez** y se guardan por sesión (`defineState`), así la propuesta
habla de la misma propiedad con el mismo precio que mostró la búsqueda. `getProperty()` lee de ese
store en modo demo, que es lo que hace que `build_proposal` funcione sin credenciales: las
connection tools del MCP sólo las puede invocar el modelo, no el código del servidor.

La demo no se anuncia como tal: no hay avisos en el chat, ni franja en el PDF, ni banner en el
mail, y los IDs siguen el formato `KP-1001` del CRM. Las `description` de las tools y de la
conexión MCP también cambian con el flag, porque el modelo le repite al asesor lo que lee en ellas.

**La salvaguarda es que el circuito es cerrado, no que esté rotulado.** En modo demo
`send_proposal_email` no le pega a Resend: renderiza el PDF, devuelve `sent: true` y no manda nada,
así que ninguna persona recibe propiedades que no existen. Por eso el flag está apagado por
defecto — encenderlo en un deploy con asesores reales haría que crean haber enviado propuestas que
nunca salieron.

## Evals

```bash
npx eve eval            # corre todos
npx eve eval --list     # sin ejecutar
```

Necesitan credenciales del proveedor de modelo, porque levantan el agente de verdad.

| Eval | Qué protege |
| --- | --- |
| `pregunta-antes-de-buscar` | Con un pedido vago, pregunta en vez de quemar una búsqueda |
| `no-inventa-propiedades` | Si KiteProp falla, avisa; no fabrica listados |
| `no-envia-sin-aprobacion` | Un "mandalo ya" no saltea la revisión de la propuesta |

`no-inventa-propiedades` depende de que las variables de KiteProp estén **vacías**: fuerza el fallo
de la API a propósito. Si las tenés cargadas en `.env.local`, ese eval no está probando lo que dice.

## Deploy en Vercel

```bash
vercel
```

`withEve()` en `next.config.ts` registra el agente como un servicio aparte en
`.vercel/output/config.json`, con su propio build. Por eso `npm run build` es solo `next build`: el
agente se compila igual. `npm run build:agent` queda como escape hatch para builds manuales.

Cargá las cinco variables de entorno en el proyecto antes del primer deploy.

## ⚠️ Auth: hoy es una demo pública

`agent/channels/eve.ts` usa `none()`, que acepta tráfico anónimo. **Cualquiera con la URL del
deploy puede usar el agente y disparar envíos de email vía Resend con tu API key**, a tu costo.

Antes de que esto deje de ser una demo, reemplazá `none()` por:

- `httpBasic()` — usuario y contraseña compartidos, alcanza para un puñado de asesores internos. Es
  un helper que ya trae eve, cero dependencias nuevas.
- Auth.js o Clerk vía un `AuthFn` propio — si querés usuarios reales.

La lista de `auth` se recorre en orden: poné tu autenticador primero y borrá `none()`, que al ser el
último acepta todo lo que los anteriores no reconocieron.

Nota: con `none()` el agente no tiene principal de usuario, así que una conexión OAuth per-user
(`principalType: "user"`) va a fallar con `principal_required` hasta que pongas auth real.

## Pendientes conocidos

- **Auth de producción** (arriba). Es lo único que bloquea un uso real.
- `agent/lib/kiteprop.ts` normaliza `id` con `String(...)`, que produce el string `"undefined"` si
  la API no manda ningún campo de ID. Debería fallar en vez de propagar un ID falso al PDF.
- Los evals no cubren el camino feliz completo (búsqueda → propuesta → envío) porque haría falta un
  fixture de KiteProp. `mockModel()` de eve sirve para eso.
