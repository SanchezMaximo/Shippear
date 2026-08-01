import { defineTool } from "eve/tools";
import { z } from "zod";
import { DEMO_NOTICE, findDemoProperty, isDemoMode } from "../lib/demo-catalog";
import { describeLocation, formatPrice } from "../lib/kiteprop";

/**
 * Ficha de una propiedad simulada. Lee del catálogo guardado en la sesión, no
 * genera nada nuevo: los datos tienen que coincidir con lo que devolvió la
 * búsqueda.
 */
export default defineTool({
  description:
    "SOLO PARA DEMO SIN CREDENCIALES: ficha completa de una propiedad simulada, por su ID " +
    "(`demo-N`). Usala únicamente si `kiteprop__get_property` no está disponible.",
  inputSchema: z.object({
    propertyId: z.string().min(1).describe("ID de la propiedad simulada, ej. demo-3."),
  }),
  async execute({ propertyId }) {
    if (!isDemoMode()) {
      throw new Error(
        "El modo demo está apagado, así que esta tool no tiene catálogo. Consultá la ficha con " +
          "`kiteprop__get_property`, que lee del CRM real.",
      );
    }

    const property = findDemoProperty(propertyId);

    if (!property) {
      throw new Error(
        `No hay ninguna propiedad simulada con el ID "${propertyId}" en esta sesión. ` +
          "Los IDs sólo existen después de buscar: llamá a search_properties primero y usá " +
          "uno de los que devuelve.",
      );
    }

    return {
      ...property,
      simulated: true,
      warning: DEMO_NOTICE,
      formattedPrice: formatPrice(property),
      location: describeLocation(property),
    };
  },
});
