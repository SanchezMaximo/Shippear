"use client";

import { useEffect, useState } from "react";
import { DASHBOARD_TITLES, TOOL_LABELS } from "@/lib/toolLabels";
import { renderGenericResultHtml } from "@/lib/render";

export default function DashboardView({ active }) {
  const [tools, setTools] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error cargando el dashboard");
      setTools(data.tools || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className={`view view-dashboard ${active ? "active" : ""}`}>
      <header className="view-header">
        <h1>Dashboard</h1>
        <p>Resumen del negocio en vivo, obtenido directo de KiteProp.</p>
        <button className="btn-secondary" onClick={load}>
          ↻ Actualizar
        </button>
      </header>

      <div className="dashboard-grid">
        {loading && (
          <>
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </>
        )}

        {!loading && error && <div className="empty-state">No se pudo cargar el dashboard: {error}</div>}

        {!loading && !error && tools && Object.keys(tools).length === 0 && (
          <div className="empty-state">El agente no devolvió datos. Probá &quot;Actualizar&quot; de nuevo.</div>
        )}

        {!loading &&
          !error &&
          tools &&
          Object.entries(tools).map(([name, t]) => {
            const meta = DASHBOARD_TITLES[name] || TOOL_LABELS[name] || { label: name, icon: "📊" };
            return (
              <div key={name} className={`data-card ${t.isError ? "error" : ""}`}>
                <h3>
                  {meta.icon} {meta.label}
                </h3>
                {t.isError ? (
                  <div className="error-text">{typeof t.result === "string" ? t.result : JSON.stringify(t.result)}</div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: renderGenericResultHtml(name, t.result, false) }} />
                )}
              </div>
            );
          })}
      </div>
    </section>
  );
}
