import { defineMcpClientConnection } from "eve/connections";
import { isDemoMode } from "../lib/demo-catalog";

/**
 * Conexión al MCP de KiteProp: la fuente real de propiedades del CRM.
 *
 * El servidor autentica con `X-API-Key` (key personal, empieza con `kp_`), no
 * con Bearer, así que la credencial va por `headers` y no por `auth`. La key
 * nunca entra en el contexto del modelo.
 *
 * El modelo descubre estas tools con `connection_search` y las llama como
 * `kiteprop__<tool>`.
 *
 * # Solo lectura, por diseño
 *
 * Kigent consulta el CRM; no lo edita. Nada de lo que hace el agente (buscar,
 * comparar, armar una propuesta) necesita escribir en KiteProp, y una escritura
 * accidental sobre el CRM de la inmobiliaria es un daño real y difícil de
 * revertir. De las 24 tools del servidor, estas 4 escriben y quedan afuera:
 *
 *   create_contact          crea un lead nuevo
 *   create_message          registra una consulta contra una propiedad
 *   create_visit_feedback   carga feedback de una visita
 *   update_property_status  cambia el estado (activa, reservada, vendida…)
 *
 * El límite se aplica en dos capas independientes:
 *
 * 1. `tools.allow` — el modelo sólo ve las 20 de lectura. Las de escritura no
 *    existen para él: no aparecen en `connection_search` ni gastan contexto.
 * 2. `approval` — segunda línea de defensa. Deniega automáticamente cualquier
 *    llamada cuyo nombre no sea de lectura, incluso si el allow-list quedó
 *    desactualizado o KiteProp agrega tools de escritura nuevas. Deniega sin
 *    preguntarle al asesor: no es una decisión que deba tomar caso por caso.
 *
 * La capa 1 sola alcanzaría hoy, pero depende de que alguien mantenga la lista
 * a mano cada vez que el servidor cambia. La capa 2 no depende de nadie.
 */

/** Las 20 tools de lectura. Ver el comentario de arriba por las 4 excluidas. */
const READ_ONLY_TOOLS = [
  // Propiedades
  "search_properties",
  "get_property",
  "compare_properties_performance",
  "get_property_performance",
  "get_property_stats",
  // Contactos y consultas de portales
  "search_contacts",
  "get_contact",
  "search_messages",
  "get_message_stats",
  // Publicación en portales
  "get_difusion_status",
  "get_difusion_report",
  "get_portal_visits_history",
  // Equipo
  "list_users",
  "get_my_profile",
  "get_agent_stats",
  // Métricas y mercado
  "get_dashboard_stats",
  "get_market_analysis",
  "get_conversion_funnel",
  // Feedback de visitas
  "get_visit_feedbacks",
  "get_feedback_summary",
] as const;

/** Verbos de lectura. Un nombre que no arranque con uno de estos se deniega. */
const READ_PREFIXES = [
  "search",
  "get",
  "list",
  "read",
  "find",
  "compare",
  "query",
  "count",
  "describe",
  "fetch",
  "view",
] as const;

/**
 * El `toolName` llega calificado (`kiteprop__search_properties`), así que hay
 * que quedarse con el nombre remoto antes de mirar el verbo.
 */
function bareToolName(toolName: string): string {
  const separator = toolName.indexOf("__");
  return separator === -1 ? toolName : toolName.slice(separator + 2);
}

function isReadOnly(toolName: string): boolean {
  const name = bareToolName(toolName).toLowerCase();
  return READ_PREFIXES.some(
    (prefix) => name === prefix || name.startsWith(`${prefix}_`),
  );
}

export default defineMcpClientConnection({
  url: process.env.KITEPROP_MCP_URL ?? "https://mcp.kiteprop.com/mcp",
  // En modo demo el modelo igual ve la conexión vía `connection_search`, y lo
  // que lea acá se lo repite al asesor. Así que la descripción lo manda derecho
  // a las tools de búsqueda en vez de dejarlo especular sobre por qué el CRM no
  // responde.
  description: isDemoMode()
    ? "Conexión no habilitada en esta instalación. Las propiedades se consultan con " +
      "`search_properties` y `get_property`."
    : "KiteProp, el CRM de la inmobiliaria. Buscá propiedades por operación, tipo, zona, " +
    "presupuesto, ambientes y amenities con `search_properties`, y traé la ficha completa " +
    "(fotos, precios, ubicación, agente asignado) con `get_property`. También expone " +
    "contactos y consultas de portales, estado de publicación, métricas del negocio, " +
    "análisis de mercado por m² y feedback de visitas. Es la única fuente válida de precios, " +
    "direcciones y disponibilidad. Solo lectura: no crea ni modifica nada en el CRM.",
  headers: {
    "X-API-Key": process.env.KITEPROP_API_KEY ?? "",
  },
  // En modo demo el CRM queda fuera del alcance del modelo: las búsquedas las
  // atiende el catálogo simulado, y tener las dos fuentes disponibles a la vez
  // sólo lograría que una propuesta mezcle propiedades reales con inventadas.
  tools: { allow: isDemoMode() ? [] : READ_ONLY_TOOLS },
  approval: ({ toolName }) => {
    if (isDemoMode()) {
      return {
        type: "denied",
        reason:
          "Esta conexión no está habilitada. Consultá las propiedades con `search_properties` " +
          "y `get_property`.",
      };
    }

    if (isReadOnly(toolName)) return "not-applicable";

    return {
      type: "denied",
      reason:
        `La tool ${bareToolName(toolName)} de KiteProp no es de solo lectura. Kigent consulta ` +
        "el CRM pero no lo modifica: usá las tools de búsqueda y consulta, y si hace falta " +
        "crear o editar algo en KiteProp, decíselo al asesor para que lo haga él.",
    };
  },
});
