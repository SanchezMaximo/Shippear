import { defineTool } from "eve/tools";
import { z } from "zod";
import { generateDemoProperties, isDemoMode } from "../lib/demo-catalog";
import { describeLocation, formatPrice } from "../lib/kiteprop";

/**
 * Búsqueda del modo demo (`KIGENT_DEMO=1`): las propiedades las genera el LLM.
 *
 * No hay forma de esconder una authored tool condicionalmente, así que el corte
 * se hace acá, en el execute. La `description` también depende del flag: en modo
 * normal tiene que quedar claro que la búsqueda va por el MCP, y en modo demo no
 * debe delatar nada — el modelo repite al asesor lo que lee en ella.
 */
export default defineTool({
  description: isDemoMode()
    ? "Busca propiedades en el CRM según las necesidades del cliente. Usala apenas el asesor " +
      "describe lo que busca. Podés llamarla varias veces con criterios distintos (ampliando " +
      "zona, subiendo presupuesto, cambiando cantidad de ambientes) para tener alternativas " +
      "antes de armar la propuesta."
    : "No disponible en esta instalación: buscá con `kiteprop__search_properties`.",
  inputSchema: z.object({
    operation: z.enum(["venta", "alquiler", "alquiler_temporario"]).optional(),
    propertyType: z
      .string()
      .optional()
      .describe("departamento, casa, PH, local, oficina, terreno, etc."),
    city: z.string().optional(),
    neighborhoods: z.array(z.string()).optional(),
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().positive().optional(),
    currency: z.string().optional(),
    minRooms: z.number().int().positive().optional(),
    minBedrooms: z.number().int().positive().optional(),
    minBathrooms: z.number().int().positive().optional(),
    minAreaM2: z.number().positive().optional(),
    features: z.array(z.string()).optional(),
    query: z.string().optional().describe("Texto libre con lo que pidió el cliente."),
    limit: z.number().int().min(3).max(8).optional().describe("Cuántas generar. Default 6."),
  }),
  async execute(input, ctx) {
    if (!isDemoMode()) {
      throw new Error(
        "El modo demo está apagado, así que esta tool no genera nada. Si " +
          "`kiteprop__search_properties` tampoco funciona, no hay ninguna fuente de propiedades " +
          "configurada: decile al asesor que cargue `KITEPROP_API_KEY` en .env.local para usar " +
          "el CRM real, o `KIGENT_DEMO=1` para trabajar con propiedades simuladas, y que " +
          "reinicie `npm run dev`. No sigas reintentando ni ofrezcas buscar de nuevo: sin una de " +
          "esas dos variables el resultado va a ser el mismo.",
      );
    }

    const properties = await generateDemoProperties(input, ctx.abortSignal);

    return {
      total: properties.length,
      returned: properties.length,
      properties: properties.map((property) => ({
        id: property.id,
        title: property.title,
        operation: property.operation,
        propertyType: property.propertyType,
        price: formatPrice(property),
        priceValue: property.price,
        currency: property.currency,
        location: describeLocation(property),
        rooms: property.rooms,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        areaM2: property.areaM2,
        features: property.features,
        status: property.status,
      })),
    };
  },
});
