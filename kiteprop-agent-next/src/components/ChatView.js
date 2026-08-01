"use client";

import { useRef, useState } from "react";
import { marked } from "marked";
import { TOOL_LABELS } from "@/lib/toolLabels";
import { renderGenericResultHtml, escapeHtml } from "@/lib/render";

const SUGGESTIONS = [
  "Dame un diagnóstico completo del negocio este mes",
  "Buscá deptos de 2 a 3 ambientes en venta hasta USD 150.000",
  "Qué mensajes llegaron esta semana sin responder?",
  "Analizá el rendimiento de mi equipo de agentes",
];

function safeMarked(text) {
  try {
    return marked.parse(text || "");
  } catch (_) {
    return escapeHtml(text);
  }
}

export default function ChatView({ active }) {
  const [history, setHistory] = useState([]); // turnos ya cerrados: {role, content}
  const [blocks, setBlocks] = useState(null); // turno del asistente en curso, o null
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const convRef = useRef([]); // historial que se manda a /api/chat
  const nameByUseId = useRef(new Map());
  const blockIndexByUseId = useRef(new Map());
  const chatWindowRef = useRef(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const el = chatWindowRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  function onBlockStart(blocksArr, data) {
    const block = data.content_block;
    if (!block) return blocksArr;

    if (block.type === "text") {
      return [...blocksArr, { kind: "text", index: data.index, text: block.text || "" }];
    }

    if (block.type === "mcp_tool_use") {
      nameByUseId.current.set(block.id, block.name);
      const newArr = [...blocksArr, { kind: "tool_use", index: data.index, id: block.id, name: block.name, status: "pending" }];
      blockIndexByUseId.current.set(block.id, newArr.length - 1);
      return newArr;
    }

    if (block.type === "mcp_tool_result") {
      const toolName = nameByUseId.current.get(block.tool_use_id) || "resultado";
      const text = (block.content || [])
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch (_) {
        parsed = null;
      }

      let newArr = blocksArr;
      if (block.is_error) {
        const idx = blockIndexByUseId.current.get(block.tool_use_id);
        if (idx != null && newArr[idx]) {
          newArr = newArr.map((b, i) => (i === idx ? { ...b, status: "error" } : b));
        }
      }
      if (parsed !== null) {
        newArr = [...newArr, { kind: "tool_result", toolName, result: parsed, isError: block.is_error }];
      }
      return newArr;
    }

    return blocksArr;
  }

  function onBlockDelta(blocksArr, data) {
    if (data.delta?.type !== "text_delta") return blocksArr;
    return blocksArr.map((b) =>
      b.kind === "text" && b.index === data.index ? { ...b, text: b.text + data.delta.text } : b
    );
  }

  function onBlockStop(blocksArr, data) {
    return blocksArr.map((b) =>
      b.kind === "tool_use" && b.index === data.index && b.status === "pending" ? { ...b, status: "done" } : b
    );
  }

  function handleRawEvent(rawEvent, blocksArr) {
    let eventName = "message";
    let dataStr = "";
    for (const line of rawEvent.split("\n")) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
    }
    if (!dataStr) return blocksArr;

    let data;
    try {
      data = JSON.parse(dataStr);
    } catch (_) {
      return blocksArr;
    }

    if (eventName === "fatal_error" || data.type === "error") {
      return [...blocksArr, { kind: "error", text: data.message || data.error?.message || "Error del agente" }];
    }

    switch (data.type) {
      case "content_block_start":
        return onBlockStart(blocksArr, data);
      case "content_block_delta":
        return onBlockDelta(blocksArr, data);
      case "content_block_stop":
        return onBlockStop(blocksArr, data);
      default:
        return blocksArr;
    }
  }

  async function send(text) {
    if (!text.trim() || sending) return;
    setSending(true);

    const userMsg = { role: "user", content: text };
    convRef.current = [...convRef.current, userMsg];
    setHistory((h) => [...h, userMsg]);
    setInputValue("");

    nameByUseId.current = new Map();
    blockIndexByUseId.current = new Map();
    let currentBlocks = [];
    setBlocks(currentBlocks);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: convRef.current }),
      });

      if (!res.ok || !res.body) {
        currentBlocks = [{ kind: "error", text: "No se pudo conectar con el agente." }];
        setBlocks(currentBlocks);
      } else {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let sep;
          while ((sep = buffer.indexOf("\n\n")) !== -1) {
            const rawEvent = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            currentBlocks = handleRawEvent(rawEvent, currentBlocks);
            setBlocks([...currentBlocks]);
            scrollToBottom();
          }
        }
      }
    } catch (err) {
      currentBlocks = [...currentBlocks, { kind: "error", text: err.message || "Error de conexión" }];
      setBlocks([...currentBlocks]);
    }

    const finalText = currentBlocks
      .filter((b) => b.kind === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (finalText) {
      const assistantMsg = { role: "assistant", content: finalText };
      convRef.current = [...convRef.current, assistantMsg];
      setHistory((h) => [...h, assistantMsg]);
    }

    setBlocks(null);
    setSending(false);
  }

  function onSubmit(e) {
    e.preventDefault();
    send(inputValue);
  }

  const showEmpty = history.length === 0 && !blocks;

  return (
    <section className={`view view-chat ${active ? "active" : ""}`}>
      <header className="view-header">
        <h1>Chat</h1>
        <p>Pedile lo que necesites en lenguaje natural: buscar propiedades, cargar un lead, ver un feedback, comparar agentes.</p>
      </header>

      <div className="chat-window" ref={chatWindowRef}>
        {showEmpty && (
          <div className="chat-empty">
            <div className="chat-empty-title">¿En qué te ayudo?</div>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="suggestion-chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((m, i) => (
          <div key={i} className={`msg-row ${m.role}`}>
            <div className="msg-avatar">{m.role === "user" ? "🧑" : "🤖"}</div>
            {m.role === "user" ? (
              <div className="msg-bubble">{m.content}</div>
            ) : (
              <div className="msg-bubble" dangerouslySetInnerHTML={{ __html: safeMarked(m.content) }} />
            )}
          </div>
        ))}

        {blocks && (
          <div className="msg-row assistant">
            <div className="msg-avatar">🤖</div>
            <div className="msg-bubble">
              {blocks.length === 0 && <span style={{ color: "var(--text-soft)" }}>Pensando…</span>}
              {blocks.map((b, i) => {
                if (b.kind === "text") {
                  return <div key={i} className="msg-text" dangerouslySetInnerHTML={{ __html: safeMarked(b.text) }} />;
                }
                if (b.kind === "tool_use") {
                  const meta = TOOL_LABELS[b.name] || { label: `Usando ${b.name}`, icon: "🔧" };
                  const cls = `tool-chip ${b.status === "done" ? "done" : ""} ${b.status === "error" ? "error" : ""}`;
                  return (
                    <div key={i} className={cls}>
                      {b.status === "pending" ? <span className="spin" /> : b.status === "error" ? "✗ " : "✓ "}
                      {meta.icon} {meta.label}
                      {b.status === "pending" ? "…" : ""}
                    </div>
                  );
                }
                if (b.kind === "tool_result") {
                  return (
                    <div
                      key={i}
                      className="inline-result"
                      dangerouslySetInnerHTML={{ __html: renderGenericResultHtml(b.toolName, b.result, b.isError) }}
                    />
                  );
                }
                if (b.kind === "error") {
                  return (
                    <div key={i} style={{ color: "#dc2626", marginTop: 6 }}>
                      ⚠️ {b.text}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}
      </div>

      <form className="chat-input-bar" onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Escribí tu pedido…"
          autoComplete="off"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button type="submit" disabled={sending}>
          Enviar
        </button>
      </form>
    </section>
  );
}
