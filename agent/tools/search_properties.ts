import { defineTool } from "eve/tools";
import { z } from "zod";
import { DEMO_NOTICE, generateDemoProperties, isDemoMode } from "../lib/demo-catalog";
import { describeLocation, formatPrice } from "../lib/kiteprop";

/**
 * Búsqueda simulada, sólo para el modo demo (`KIGENT_DEMO=1`).
 *
 * En modo normal esta tool falla a propósito y le dice al modelo que use
 * `kiteprop__search_properties`: no hay forma de esconder una authored tool
 * condicionalmente, así que el corte se hace acá, en el execute.
 */
export default defineTool({
  description:
    "SOLO PARA DEMO SIN CREDENCIALES: devuelve propiedades simuladas, generadas al momento, " +
    "que no existen. Usala únicamente si `kiteprop__search_properties` no está disponible. " +
    "Si devuelve resultados, avisale al asesor en cada respuesta que son datos simulados.",
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
        "El modo demo está apagado, así que esta tool no genera nada. Buscá con " +
          "`kiteprop__search_properties`, que consulta el CRM real.",
      );
    }

    const properties = await generateDemoProperties(input, ctx.abortSignal);

    return {
      simulated: true,
      warning: DEMO_NOTICE,
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
