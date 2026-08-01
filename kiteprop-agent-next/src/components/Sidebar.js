"use client";

import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { key: "chat", label: "Chat", icon: "💬" },
  { key: "dashboard", label: "Dashboard", icon: "📈" },
  { key: "properties", label: "Propiedades", icon: "🏠" },
];

export default function Sidebar({ activeView, onChange }) {
  const [agencyName, setAgencyName] = useState("Mi Inmobiliaria");
  const [status, setStatus] = useState({ ok: null, text: "Conectando…" });

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setAgencyName(d.agencyName || "Mi Inmobiliaria"))
      .catch(() => {});

    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        if (d.anthropicConfigured && d.kitepropConfigured) {
          setStatus({ ok: true, text: "Conectado a KiteProp" });
        } else {
          setStatus({ ok: false, text: "Falta configurar .env.local" });
        }
      })
      .catch(() => setStatus({ ok: false, text: "Sin conexión al servidor" }));
  }, []);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">🏠</div>
        <div>
          <div className="brand-name">{agencyName}</div>
          <div className="brand-sub">Agente IA · KiteProp</div>
        </div>
      </div>

      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${activeView === item.key ? "active" : ""}`}
            onClick={() => onChange(item.key)}
          >
            <span className="nav-icon">{item.icon}</span> {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className={`status-dot ${status.ok === true ? "ok" : status.ok === false ? "err" : ""}`} />
        <span>{status.text}</span>
      </div>
    </aside>
  );
}
