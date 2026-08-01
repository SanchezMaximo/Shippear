/**
 * Catálogo simulado: propiedades verosímiles generadas por el LLM en vez de
 * consultadas a KiteProp.
 *
 * Existe para poder mostrar el flujo completo (buscar → proponer → enviar) sin
 * credenciales del CRM. Está apagado por defecto y sólo se enciende con
 * `KIGENT_DEMO=1`: el modo normal sigue yendo al MCP de KiteProp, y sin la
 * variable este archivo no se ejecuta nunca.
 *
 * # Por qué está detrás de un flag, y por qué el circuito es cerrado
 *
 * Todo el diseño de Kigent está construido sobre una regla: ninguna propiedad
 * sale de la cabeza del modelo. Este módulo hace exactamente lo contrario. Lo
 * que lo vuelve inofensivo es que en modo demo nada sale del sistema: la
 * propuesta se arma y el PDF se genera, pero `send_proposal_email` no le pega a
 * Resend, así que ninguna persona recibe un listado de propiedades que no
 * existen. Esa es la salvaguarda —el circuito cerrado, no una advertencia— y
 * por eso el flag está apagado por defecto.
 *
 * Las propiedades se generan una vez y se guardan por sesión, así una búsqueda
 * y la propuesta que sale de ella hablan de la misma propiedad con el mismo
 * precio. Sin eso, `build_proposal` volvería a inventar y los números no
 * coincidirían con lo que el asesor vio.
 */

import { generateObject } from "ai";
import { defineState } from "eve/context";
import { z } from "zod";
import type { Property, PropertySearchFilters } from "./kiteprop";

/** El mismo modelo del agente, vía el AI Gateway de Vercel. */
const DEMO_MODEL = "anthropic/claude-sonnet-5";

export function isDemoMode(): boolean {
  const flag = process.env.KIGENT_DEMO;
  return flag === "1" || flag === "true";
}

const generatedPropertySchema = z.object({
  title: z.string().describe("Título de la publicación, como lo escribiría una inmobiliaria."),
  operation: z.enum(["venta", "alquiler", "alquiler_temporario"]),
  propertyType: z.string().describe("departamento, casa, PH, local, oficina, terreno…"),
  price: z.number().positive().describe("Precio en la moneda de `currency`, coherente con la zona."),
  currency: z.string().describe("USD para venta, ARS para alquiler, salvo que el pedido diga otra."),
  expenses: z.number().nonnegative().nullable().describe("Expensas mensuales en ARS, o null."),
  address: z.string().describe("Calle y altura. Que la calle exista en el barrio."),
  neighborhood: z.string(),
  city: z.string(),
  rooms: z.number().int().positive().describe("Ambientes totales."),
  bedrooms: z.number().int().nonnegative(),
  bathrooms: z.number().int().positive(),
  areaM2: z.number().positive(),
  features: z.array(z.string()).describe("Cochera, balcón, amenities, apto crédito, pet friendly…"),
  description: z.string().describe("2-4 oraciones, tono de aviso inmobiliario, sin exagerar."),
  status: z.string().describe("Disponible, Reservada, etc."),
});

const catalogSchema = z.object({
  properties: z.array(generatedPropertySchema).min(1).max(12),
});

type DemoStore = {
  /** Contador incremental: los IDs no dependen de aleatoriedad dentro del workflow. */
  nextId: number;
  properties: Record<string, Property>;
};

const store = defineState<DemoStore>("kigent.demo-catalog", () => ({
  nextId: 1,
  properties: {},
}));

/** Formato de referencia de KiteProp, para que el ID del PDF no desentone. */
function saveProperty(property: Omit<Property, "id">): Property {
  const { nextId } = store.get();
  const saved: Property = { ...property, id: `KP-${1000 + nextId}` };

  store.update((current) => ({
    nextId: current.nextId + 1,
    properties: { ...current.properties, [saved.id]: saved },
  }));

  return saved;
}

/** Busca en lo ya generado esta sesión. `build_proposal` depende de esto. */
export function findDemoProperty(id: string): Property | null {
  return store.get().properties[id] ?? null;
}

function describeFilters(filters: PropertySearchFilters): string {
  const parts = [
    filters.operation && `operación: ${filters.operation}`,
    filters.propertyType && `tipo: ${filters.propertyType}`,
    filters.city && `ciudad: ${filters.city}`,
    filters.neighborhoods?.length && `barrios: ${filters.neighborhoods.join(", ")}`,
    filters.minPrice && `precio mínimo: ${filters.minPrice}`,
    filters.maxPrice && `precio máximo: ${filters.maxPrice}`,
    filters.currency && `moneda: ${filters.currency}`,
    filters.minRooms && `ambientes mínimos: ${filters.minRooms}`,
    filters.minBedrooms && `dormitorios mínimos: ${filters.minBedrooms}`,
    filters.minBathrooms && `baños mínimos: ${filters.minBathrooms}`,
    filters.minAreaM2 && `superficie mínima: ${filters.minAreaM2} m²`,
    filters.features?.length && `requisitos: ${filters.features.join(", ")}`,
    filters.query && `pedido textual del cliente: "${filters.query}"`,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join("\n") : "Sin filtros: elegí vos un caso plausible.";
}

/**
 * Genera propiedades que encajan con los filtros y las guarda en la sesión.
 *
 * Pide una que no encaje del todo a propósito: un catálogo donde las 6 opciones
 * son perfectas no se parece a un CRM real, y deja al agente sin nada que
 * señalar como "a tener en cuenta" en la propuesta.
 */
export async function generateDemoProperties(
  filters: PropertySearchFilters,
  signal?: AbortSignal,
): Promise<Property[]> {
  const count = Math.min(Math.max(filters.limit ?? 6, 3), 8);

  const { object } = await generateObject({
    abortSignal: signal,
    model: DEMO_MODEL,
    schema: catalogSchema,
    system:
      "Generás datos de prueba para el catálogo de una inmobiliaria argentina. Las propiedades " +
      "tienen que ser verosímiles para el mercado de la zona pedida: precios, expensas, " +
      "superficies y calles coherentes entre sí y con el barrio. Escribí en español rioplatense.",
    prompt:
      `Generá ${count} propiedades que encajen con este pedido:\n\n${describeFilters(filters)}\n\n` +
      "Variá precios, superficies y estado de conservación entre ellas: un catálogo real no " +
      "tiene seis opciones idénticas. Incluí una que encaje sólo parcialmente (por ejemplo, " +
      "sin cochera o un poco por encima del presupuesto), para que haya algo que aclararle al " +
      "cliente. Respetá los topes de presupuesto que te dieron, salvo en esa.",
  });

  return object.properties.map((generated) =>
    saveProperty({ ...generated, imageUrl: null, url: null }),
  );
}
