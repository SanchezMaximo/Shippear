// Renderer generico: como KiteProp no publica el JSON Schema exacto de cada
// herramienta, estas funciones detectan la forma de los datos (lista de
// propiedades, tabla, stats simples) y devuelven HTML ya armado, sin asumir
// nombres de campo exactos. Se usan tanto en Dashboard/Propiedades como
// inline en el chat (via dangerouslySetInnerHTML).

export function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function pick(obj, keys) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return null;
}

export function prettifyKey(key) {
  return key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function formatScalar(v) {
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "number") return v.toLocaleString("es-AR");
  return String(v);
}

export function formatPrice(item) {
  let value = pick(item, ["price", "precio", "price_usd", "valor", "amount"]);
  let currency = pick(item, ["currency", "moneda"]) || "USD";
  if (value && typeof value === "object") {
    currency = pick(value, ["currency", "moneda"]) || currency;
    value = pick(value, ["amount", "value", "valor"]);
  }
  if (value == null) return null;
  const num = Number(value);
  if (!isNaN(num)) return `${currency} ${num.toLocaleString("es-AR")}`;
  return `${currency} ${value}`;
}

export function findArrayIn(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key]) && data[key].length && typeof data[key][0] === "object") {
        return data[key];
      }
    }
  }
  return null;
}

export function looksLikeProperties(items) {
  if (!items || !items.length) return false;
  const keys = Object.keys(items[0] || {}).map((k) => k.toLowerCase());
  return keys.some((k) =>
    ["price", "precio", "address", "direccion", "titulo", "title", "ambientes", "rooms", "m2", "superficie"].includes(k)
  );
}

export function firstImageUrl(item) {
  const candidates = pick(item, ["photos", "images", "fotos", "imagenes"]);
  if (Array.isArray(candidates) && candidates.length) {
    const first = candidates[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") return first.url || first.src || null;
  }
  const single = pick(item, ["photo", "image", "foto", "imagen", "cover"]);
  return typeof single === "string" ? single : null;
}

export function renderPropertyCardsHtml(items) {
  const cards = items
    .slice(0, 24)
    .map((item) => {
      const title =
        pick(item, ["title", "titulo", "name", "nombre", "address", "direccion"]) ||
        `Propiedad ${pick(item, ["code", "id", "kp_id"]) || ""}`;
      const price = formatPrice(item);
      const status = pick(item, ["status", "estado"]);
      const rooms = pick(item, ["rooms", "ambientes", "bedrooms"]);
      const m2 = pick(item, ["m2", "superficie", "surface"]);
      const location = pick(item, ["location", "ubicacion", "zone", "zona", "barrio", "neighborhood"]);
      const image = firstImageUrl(item);
      const code = pick(item, ["code", "id", "kp_id"]);

      return `
        <div class="property-card">
          <div class="thumb">${image ? `<img src="${escapeHtml(image)}" alt="">` : "🏠"}</div>
          <div class="body">
            <div class="title">${escapeHtml(String(title))}</div>
            ${price ? `<div class="price">${escapeHtml(price)}</div>` : ""}
            <div class="meta">
              ${rooms ? `<span>${escapeHtml(String(rooms))} amb.</span>` : ""}
              ${m2 ? `<span>${escapeHtml(String(m2))} m²</span>` : ""}
              ${location ? `<span>${escapeHtml(String(location))}</span>` : ""}
              ${code ? `<span>#${escapeHtml(String(code))}</span>` : ""}
            </div>
            ${status ? `<div class="status">${escapeHtml(String(status))}</div>` : ""}
          </div>
        </div>`;
    })
    .join("");

  const more =
    items.length > 24
      ? `<div class="empty-state" style="grid-column:1/-1;">+ ${items.length - 24} resultados más</div>`
      : "";

  return `<div class="properties-grid" style="grid-column:1/-1;margin-top:6px;">${cards}${more}</div>`;
}

export function renderMiniTableHtml(items) {
  const cols = Object.keys(items[0]).filter((k) => typeof items[0][k] !== "object").slice(0, 5);
  const head = `<tr>${cols.map((c) => `<th>${escapeHtml(prettifyKey(c))}</th>`).join("")}</tr>`;
  const rows = items
    .slice(0, 8)
    .map(
      (item) =>
        `<tr>${cols
          .map((c) => `<td>${escapeHtml(item[c] != null ? formatScalar(item[c]) : "")}</td>`)
          .join("")}</tr>`
    )
    .join("");
  return `<table class="mini-table"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}

export function renderStatRowsHtml(data, depth = 0) {
  let out = "";
  for (const [key, value] of Object.entries(data)) {
    if (value == null || value === "") continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      if (typeof value[0] === "object") {
        out += `<div class="stat-row"><span class="stat-label">${escapeHtml(prettifyKey(key))}</span></div>`;
        out += renderMiniTableHtml(value);
      } else {
        out += `<div class="stat-row"><span class="stat-label">${escapeHtml(
          prettifyKey(key)
        )}</span><span class="stat-value">${escapeHtml(value.join(", "))}</span></div>`;
      }
      continue;
    }

    if (typeof value === "object") {
      if (depth < 1) {
        out += `<div class="stat-row"><span class="stat-label" style="font-weight:700;">${escapeHtml(
          prettifyKey(key)
        )}</span></div>`;
        out += renderStatRowsHtml(value, depth + 1);
      }
      continue;
    }

    out += `<div class="stat-row"><span class="stat-label">${escapeHtml(
      prettifyKey(key)
    )}</span><span class="stat-value">${escapeHtml(formatScalar(value))}</span></div>`;
  }
  return out;
}

export function renderGenericResultHtml(toolName, data, isError) {
  if (isError) {
    return `<div class="error-text">${escapeHtml(typeof data === "string" ? data : JSON.stringify(data))}</div>`;
  }
  if (data == null) {
    return `<div class="stat-row"><span class="stat-label">Sin datos</span></div>`;
  }

  const items = findArrayIn(data);

  if (items && (toolName === "search_properties" || looksLikeProperties(items))) {
    return renderPropertyCardsHtml(items);
  }
  if (items && items.length) {
    return renderMiniTableHtml(items);
  }
  if (typeof data === "object") {
    return renderStatRowsHtml(data);
  }
  return `<div class="stat-row">${escapeHtml(String(data))}</div>`;
}
