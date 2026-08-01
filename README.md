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
| KiteProp | API REST del CRM inmobiliario (fuente de toda propiedad) |
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
| `KITEPROP_API_URL` | Base de la API de KiteProp, sin barra final |
| `KITEPROP_API_KEY` | Se manda como `Authorization: Bearer <key>` |
| `RESEND_API_KEY` | Envío del email |
| `PROPOSAL_FROM_EMAIL` | Remitente con dominio verificado en Resend |

Sin las de KiteProp, `search_properties` y `get_property` fallan con un mensaje explícito y el
agente le avisa al asesor en vez de inventar propiedades. Sin las de Resend, todo funciona menos el
último paso.

## Cómo está organizado

```
agent/                      Todo lo que define al agente (eve lo descubre por convención)
├── agent.ts                Modelo y configuración de runtime
├── instructions.md         System prompt: identidad, flujo de 5 pasos, reglas
├── channels/eve.ts         Canal HTTP y política de auth
├── tools/                  Cada archivo es una tool; el nombre del archivo es su nombre
│   ├── search_properties.ts
│   ├── get_property.ts
│   ├── build_proposal.ts
│   └── send_proposal_email.ts
└── lib/                    Código compartido, sin React ni nada de la UI
    ├── kiteprop.ts         Cliente tipado de la API + helpers de formato
    ├── proposal.ts         Esquema Zod de la propuesta y enriquecimiento
    ├── proposal-store.ts   Propuestas aprobadas, por sesión (defineState)
    └── proposal-pdf.ts     Render del PDF

app/                        UI de Next.js
components/                 AI Elements y shadcn/ui
evals/                      Checks de comportamiento del agente
```

`agent/lib/` no importa nada de la UI a propósito: corre en el runtime serverless.

## El flujo, y por qué está armado así

1. `search_properties` — busca en KiteProp. El agente puede llamarla varias veces aflojando
   criterios, y tiene que decir explícitamente qué relajó.
2. `get_property` — ficha completa de una propiedad puntual.
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
