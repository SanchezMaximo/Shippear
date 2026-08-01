import { defineTool } from "eve/tools";
import { z } from "zod";
import { describeLocation, formatPrice, searchProperties } from "../lib/kiteprop";

export default defineTool({
  description:
    "Busca propiedades en KiteProp según las necesidades del cliente. Usala apenas el asesor " +
    "describe lo que busca su cliente. Podés llamarla varias veces con criterios distintos " +
    "(ampliando zona, subiendo presupuesto, cambiando cantidad de ambientes) para tener " +
    "alternativas antes de armar la propuesta.",
  inputSchema: z.object({
    operation: z
      .enum(["venta", "alquiler", "alquiler_temporario"])
      .optional()
      .describe("Tipo de operación que busca el cliente."),
    propertyType: z
      .string()
      .optional()
      .describe("Tipo de propiedad: departamento, casa, PH, local, oficina, terreno, etc."),
    city: z.string().optional().describe("Ciudad o partido."),
    neighborhoods: z
      .array(z.string())
      .optional()
      .describe("Barrios o zonas de interés del cliente."),
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().positive().optional().describe("Tope de presupuesto del cliente."),
    currency: z.string().optional().describe("Moneda del presupuesto, ej. USD o ARS."),
    minRooms: z.number().int().positive().optional().describe("Ambientes mínimos."),
    minBedrooms: z.number().int().positive().optional().describe("Dormitorios mínimos."),
    minBathrooms: z.number().int().positive().optional(),
    minAreaM2: z.number().positive().optional().describe("Superficie mínima en m²."),
    features: z
      .array(z.string())
      .optional()
      .describe("Requisitos puntuales: cochera, balcón, apto profesional, pet friendly, amenities."),
    query: z
      .string()
      .optional()
      .describe("Texto libre con lo que dijo el cliente, para la búsqueda semántica de KiteProp."),
    limit: z.number().int().min(1).max(25).optional().describe("Máximo de resultados. Default 10."),
  }),
  async execute(input, ctx) {
    const { properties, total } = await searchProperties(input, ctx.abortSignal);

    return {
      total,
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
        url: property.url,
      })),
    };
  },
});
