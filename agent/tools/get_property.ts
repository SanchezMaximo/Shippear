import { defineTool } from "eve/tools";
import { z } from "zod";
import { describeLocation, formatPrice, getProperty } from "../lib/kiteprop";

export default defineTool({
  description:
    "Trae la ficha completa de una propiedad de KiteProp por su ID, incluida la descripción " +
    "larga. Usala cuando necesites detalle que la búsqueda no devuelve, por ejemplo para " +
    "responder una repregunta puntual del asesor.",
  inputSchema: z.object({
    propertyId: z.string().min(1).describe("ID de la propiedad en KiteProp."),
  }),
  async execute({ propertyId }, ctx) {
    const property = await getProperty(propertyId, ctx.abortSignal);

    return {
      ...property,
      formattedPrice: formatPrice(property),
      location: describeLocation(property),
    };
  },
});
