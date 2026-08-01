/**
 * Cliente tipado de la API REST de KiteProp.
 *
 * Configuración por entorno:
 *   KITEPROP_API_URL  base de la API, ej. https://api.kiteprop.com/v1
 *   KITEPROP_API_KEY  API key enviada como `Authorization: Bearer <key>`
 *
 * Los endpoints asumidos son `GET /properties` (con filtros por query string)
 * y `GET /properties/:id`. Si la API real usa otras rutas, nombres de campo o
 * esquema de auth, ajustá `request()` y `normalizeProperty()` — el resto del
 * agente trabaja contra el tipo `Property` y no necesita cambios.
 */

import { findDemoProperty, isDemoMode } from "./demo-catalog";

export type Operation = "venta" | "alquiler" | "alquiler_temporario";

export type Property = {
  id: string;
  title: string;
  operation: Operation | string;
  propertyType: string;
  /** Precio en la moneda de `currency`. `null` cuando la publicación es "consultar precio". */
  price: number | null;
  currency: string;
  /** Expensas mensuales, cuando aplica. */
  expenses: number | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  /** Superficie total en m². */
  areaM2: number | null;
  /** Cochera, amenities, apto crédito, etc. */
  features: string[];
  description: string | null;
  status: string | null;
  url: string | null;
  imageUrl: string | null;
};

export type PropertySearchFilters = {
  operation?: Operation;
  propertyType?: string;
  city?: string;
  neighborhoods?: string[];
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  minRooms?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  minAreaM2?: number;
  features?: string[];
  /** Texto libre con lo que pidió el cliente. */
  query?: string;
  limit?: number;
};

export type PropertySearchResult = {
  properties: Property[];
  total: number;
};

class KitePropError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "KitePropError";
  }
}

function config(): { baseUrl: string; apiKey: string } {
  const baseUrl = process.env.KITEPROP_API_URL;
  const apiKey = process.env.KITEPROP_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new KitePropError(
      "Faltan las variables de entorno KITEPROP_API_URL y/o KITEPROP_API_KEY. " +
        "Cargalas en .env.local (desarrollo) o en el proyecto de Vercel (producción).",
    );
  }

  return { apiKey, baseUrl: baseUrl.replace(/\/+$/, "") };
}

async function request<T>(path: string, params: URLSearchParams | undefined, signal?: AbortSignal) {
  const { apiKey, baseUrl } = config();
  const query = params && [...params.keys()].length > 0 ? `?${params.toString()}` : "";

  const response = await fetch(`${baseUrl}${path}${query}`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    signal,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new KitePropError(
      `KiteProp respondió ${response.status} en ${path}${body ? `: ${body.slice(0, 300)}` : ""}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

function num(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Tolera variantes de nombres de campo para no romper ante cambios menores de la API. */
function normalizeProperty(raw: Record<string, any>): Property {
  const address = raw.address ?? raw.direccion ?? raw.location?.address;
  const neighborhood = raw.neighborhood ?? raw.barrio ?? raw.location?.neighborhood;
  const city = raw.city ?? raw.ciudad ?? raw.location?.city;

  return {
    address: str(address),
    areaM2: num(raw.areaM2 ?? raw.area ?? raw.surface ?? raw.superficie),
    bathrooms: num(raw.bathrooms ?? raw.banos),
    bedrooms: num(raw.bedrooms ?? raw.dormitorios),
    city: str(city),
    currency: str(raw.currency ?? raw.moneda) ?? "USD",
    description: str(raw.description ?? raw.descripcion),
    expenses: num(raw.expenses ?? raw.expensas),
    features: Array.isArray(raw.features ?? raw.amenities)
      ? (raw.features ?? raw.amenities).filter((f: unknown) => typeof f === "string")
      : [],
    id: String(raw.id ?? raw._id ?? raw.reference ?? raw.codigo),
    imageUrl: str(raw.imageUrl ?? raw.coverImage ?? raw.images?.[0]?.url ?? raw.images?.[0]),
    neighborhood: str(neighborhood),
    operation: str(raw.operation ?? raw.operacion) ?? "venta",
    price: num(raw.price ?? raw.precio ?? raw.amount),
    propertyType: str(raw.propertyType ?? raw.tipo ?? raw.type) ?? "propiedad",
    rooms: num(raw.rooms ?? raw.ambientes),
    status: str(raw.status ?? raw.estado),
    title: str(raw.title ?? raw.titulo ?? raw.name) ?? "Propiedad sin título",
    url: str(raw.url ?? raw.permalink ?? raw.link),
  };
}

export async function searchProperties(
  filters: PropertySearchFilters,
  signal?: AbortSignal,
): Promise<PropertySearchResult> {
  const params = new URLSearchParams();
  const append = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  };

  append("operation", filters.operation);
  append("property_type", filters.propertyType);
  append("city", filters.city);
  append("neighborhood", filters.neighborhoods);
  append("min_price", filters.minPrice);
  append("max_price", filters.maxPrice);
  append("currency", filters.currency);
  append("min_rooms", filters.minRooms);
  append("min_bedrooms", filters.minBedrooms);
  append("min_bathrooms", filters.minBathrooms);
  append("min_area", filters.minAreaM2);
  append("features", filters.features);
  append("q", filters.query);
  append("limit", filters.limit ?? 10);

  const payload = await request<any>("/properties", params, signal);
  const list: unknown[] = Array.isArray(payload)
    ? payload
    : (payload.data ?? payload.results ?? payload.properties ?? []);

  const properties = list
    .filter((item): item is Record<string, any> => typeof item === "object" && item !== null)
    .map(normalizeProperty);

  return {
    properties,
    total: num(payload?.total ?? payload?.count) ?? properties.length,
  };
}

export async function getProperty(id: string, signal?: AbortSignal): Promise<Property> {
  // En modo demo el catálogo vive en la sesión, no en ninguna API. Este es el
  // punto por el que `build_proposal` funciona sin credenciales: enrichProposal()
  // llama acá desde el servidor, y las connection tools del MCP sólo las puede
  // invocar el modelo.
  if (isDemoMode()) {
    const property = findDemoProperty(id);

    if (!property) {
      throw new Error(
        `No se encontró ninguna propiedad con el ID "${id}". Verificá los IDs con ` +
          "search_properties y armá la propuesta con los que devuelve.",
      );
    }

    return property;
  }

  const payload = await request<any>(`/properties/${encodeURIComponent(id)}`, undefined, signal);
  const raw = payload?.data ?? payload?.property ?? payload;
  return normalizeProperty(raw);
}

export function formatPrice(property: Pick<Property, "price" | "currency" | "expenses">): string {
  if (property.price === null) return "Consultar precio";

  const amount = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(
    property.price,
  );
  const base = `${property.currency} ${amount}`;

  if (property.expenses === null || property.expenses === 0) return base;

  const expenses = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(
    property.expenses,
  );
  return `${base} + ${expenses} de expensas`;
}

export function describeLocation(property: Property): string {
  return [property.address, property.neighborhood, property.city].filter(Boolean).join(", ");
}

/** "alquiler_temporario" -> "Alquiler temporario" */
export function humanize(value: string): string {
  const text = value.replaceAll("_", " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function count(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

/** Ambientes, dormitorios, baños y superficie, ya pluralizados. */
export function describeSpecs(property: Property): string[] {
  return [
    property.rooms !== null ? count(property.rooms, "ambiente", "ambientes") : null,
    property.bedrooms !== null ? count(property.bedrooms, "dormitorio", "dormitorios") : null,
    property.bathrooms !== null ? count(property.bathrooms, "baño", "baños") : null,
    property.areaM2 !== null ? `${property.areaM2} m²` : null,
  ].filter((item): item is string => item !== null);
}
