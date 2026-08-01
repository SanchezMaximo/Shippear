/**
 * Nombres legibles para las tool calls que el asesor ve en el chat.
 *
 * Los nombres reales son identificadores (`kiteprop__search_properties`,
 * `send_proposal_email`): sirven para el modelo, no para una persona. Acá se
 * traducen a una etiqueta corta más el verbo en gerundio que se muestra
 * mientras la llamada está en curso.
 *
 * Las tools del MCP llegan calificadas como `<conexión>__<tool>`. El fallback
 * cubre cualquier tool que KiteProp agregue después sin que aparezca un
 * identificador crudo en pantalla.
 */

export type ToolLabel = {
  /** Qué se está haciendo, en sustantivo. */
  readonly label: string;
  /** Gerundio que acompaña a la etiqueta mientras corre. */
  readonly running: string;
};

const CONSULTANDO = "consultando…";
const BUSCANDO = "buscando…";

const LABELS: Readonly<Record<string, ToolLabel>> = {
  // Tools propias del agente
  build_proposal: { label: "Propuesta para el cliente", running: "armando…" },
  send_proposal_email: { label: "Envío al cliente", running: "enviando…" },

  // Tools del framework
  connection_search: { label: "Herramientas de KiteProp", running: BUSCANDO },
  // `ask_question` queda corriendo hasta que el asesor responde: el gerundio
  // tiene que decir que la pelota está del lado de él, no del agente.
  ask_question: { label: "Pregunta al asesor", running: "esperando tu respuesta…" },

  // KiteProp · propiedades
  kiteprop__search_properties: { label: "Búsqueda de propiedades", running: BUSCANDO },
  kiteprop__get_property: { label: "Ficha de la propiedad", running: CONSULTANDO },
  kiteprop__compare_properties_performance: {
    label: "Comparación de propiedades",
    running: "comparando…",
  },
  kiteprop__get_property_performance: {
    label: "Rendimiento de la propiedad",
    running: CONSULTANDO,
  },
  kiteprop__get_property_stats: { label: "Estadísticas de la propiedad", running: CONSULTANDO },

  // KiteProp · contactos y consultas de portales
  kiteprop__search_contacts: { label: "Búsqueda de contactos", running: BUSCANDO },
  kiteprop__get_contact: { label: "Ficha del contacto", running: CONSULTANDO },
  kiteprop__search_messages: { label: "Consultas de portales", running: BUSCANDO },
  kiteprop__get_message_stats: { label: "Estadísticas de mensajes", running: CONSULTANDO },

  // KiteProp · publicación en portales
  kiteprop__get_difusion_status: { label: "Publicación en portales", running: CONSULTANDO },
  kiteprop__get_difusion_report: { label: "Reporte de publicaciones", running: CONSULTANDO },
  kiteprop__get_portal_visits_history: {
    label: "Historial de visitas por portal",
    running: CONSULTANDO,
  },

  // KiteProp · equipo
  kiteprop__list_users: { label: "Agentes del equipo", running: CONSULTANDO },
  kiteprop__get_my_profile: { label: "Perfil del asesor", running: CONSULTANDO },
  kiteprop__get_agent_stats: { label: "Rendimiento por agente", running: CONSULTANDO },

  // KiteProp · métricas y mercado
  kiteprop__get_dashboard_stats: { label: "Resumen del negocio", running: CONSULTANDO },
  kiteprop__get_market_analysis: { label: "Análisis de mercado", running: CONSULTANDO },
  kiteprop__get_conversion_funnel: { label: "Embudo de conversión", running: CONSULTANDO },

  // KiteProp · feedback de visitas
  kiteprop__get_visit_feedbacks: { label: "Feedback de visitas", running: CONSULTANDO },
  kiteprop__get_feedback_summary: { label: "Resumen de feedback", running: CONSULTANDO },
};

/** "kiteprop__get_market_analysis" -> "Get market analysis" */
function humanizeToolName(toolName: string): string {
  const separator = toolName.indexOf("__");
  const bare = separator === -1 ? toolName : toolName.slice(separator + 2);
  const words = bare.replaceAll("_", " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function toolLabel(toolName: string): ToolLabel {
  return LABELS[toolName] ?? { label: humanizeToolName(toolName), running: "trabajando…" };
}
