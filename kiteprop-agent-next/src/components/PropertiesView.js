"use client";

import { useState } from "react";
import { renderGenericResultHtml } from "@/lib/render";

export default function PropertiesView({ active }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [html, setHtml] = useState(null);
  const [emptyMsg, setEmptyMsg] = useState("Hacé una búsqueda para ver resultados acá.");

  async function onSubmit(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setHtml(null);

    try {
      const res = await fetch("/api/properties/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en la búsqueda");

      if (data.isError || data.result == null) {
        setEmptyMsg(data.note || "Sin resultados.");
        setHtml(null);
      } else {
        setHtml(renderGenericResultHtml("search_properties", data.result, false));
      }
    } catch (err) {
      setEmptyMsg(`Error: ${err.message}`);
      setHtml(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={`view view-properties ${active ? "active" : ""}`}>
      <header className="view-header">
        <h1>Propiedades</h1>
        <p>Buscá en lenguaje natural: tipo, precio, ambientes, ubicación, amenities.</p>
      </header>

      <form className="search-bar" onSubmit={onSubmit}>
        <input
          type="text"
          placeholder='Ej: "departamentos en venta 2-3 ambientes con balcón hasta USD 150.000"'
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </form>

      <div className="properties-grid">
        {loading && (
          <>
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </>
        )}
        {!loading && html && <div style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: html }} />}
        {!loading && !html && <div className="empty-state">{emptyMsg}</div>}
      </div>
    </section>
  );
}
