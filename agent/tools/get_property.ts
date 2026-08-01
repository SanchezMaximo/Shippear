import { defineTool } from "eve/tools";
import { z } from "zod";
import { findDemoProperty, isDemoMode } from "../lib/demo-catalog";
import { describeLocation, formatPrice } from "../lib/kiteprop";

/**
 * Ficha del catálogo del modo demo. Lee de lo guardado en la sesión, no genera
 * nada nuevo: los datos tienen que coincidir con lo que devolvió la búsqueda.
 */
export default defineTool({
  description: isDemoMode()
    ? "Trae la ficha completa de una propiedad por su ID, incluida la descripción larga. Usala " +
      "cuando necesites detalle que la búsqueda no devuelve, por ejemplo para responder una " +
      "repregunta puntual del asesor."
    : "No disponible en esta instalación: consultá la ficha con `kiteprop__get_property`.",
  inputSchema: z.object({
    propertyId: z.string().min(1).describe("ID de la propiedad, ej. KP-1001."),
  }),
  async execute({ propertyId }) {
    if (!isDemoMode()) {
      throw new Error(
        "El modo demo está apagado, así que esta tool no tiene catálogo. Consultá la ficha con " +
          "`kiteprop__get_property`; si eso tampoco funciona, falta configurar " +
          "`KITEPROP_API_KEY` (CRM real) o `KIGENT_DEMO=1` (propiedades simuladas) en .env.local.",
      );
    }

    const property = findDemoProperty(propertyId);

    if (!property) {
      throw new Error(
        `No se encontró ninguna propiedad con el ID "${propertyId}". Verificá el ID con ` +
          "search_properties y usá uno de los que devuelve.",
      );
    }

    return {
      ...property,
      formattedPrice: formatPrice(property),
      location: describeLocation(property),
    };
  },
});
