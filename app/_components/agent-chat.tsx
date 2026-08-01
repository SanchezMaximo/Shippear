"use client";

import type { UserContent } from "ai";
import { Client, type MessageStreamEvent } from "eve/client";
import { useEveAgent } from "eve/react";
import { AlertCircleIcon, PhoneIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { InputGroupButton } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import { AgentMessage } from "./agent-message";
import { CallMode } from "./call-mode";
import { ConsoleShell } from "./console-shell";
import { CallDemoResponse } from "./demo-response";
import { PERSONA } from "./landing/persona";
import { MicButton, type MicState } from "./mic-button";
import { isSpeechSupported } from "./speech";

const AGENT_NAME = "Kigent";

/**
 * Modo demo: sin AI_GATEWAY_API_KEY el agente no responde, así que la respuesta a una
 * llamada se simula (guionada). El otro equipo lo apaga poniéndolo en false al conectar keys.
 */
const DEMO_MODE = true;

/** Arranques típicos de un asesor, para que la pantalla vacía no sea un cursor solo. */
const EXAMPLE_PROMPTS = [
  "Cliente busca 3 ambientes en Palermo para alquilar, hasta 900.000 ARS, con cochera.",
  "Pareja quiere comprar casa en Tigre, hasta USD 250.000, mínimo 3 dormitorios y patio.",
  "Necesito un local a la calle en Villa Crespo para alquiler comercial, 60 m² o más.",
];

type AgentStatus = ReturnType<typeof useEveAgent>["status"];
type CancellationState = "idle" | "requested" | "cancelling";

type Cancellation = {
  requested: boolean;
  sentTurnId?: string;
  turnId?: string;
};

export function AgentChat() {
  const [session] = useState(() =>
    new Client({ host: "", preserveCompletedSessions: true }).session(),
  );
  const cancellationRef = useRef<Cancellation>({ requested: false });
  const [cancellationError, setCancellationError] = useState<string>();
  const [cancellationState, setCancellationState] = useState<CancellationState>("idle");
  const [micState, setMicState] = useState<MicState>({ recording: false, error: null });
  const [callOpen, setCallOpen] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    setSpeechSupported(isSpeechSupported());
  }, []);

  const cancelTurn = useCallback(
    (turnId: string) => {
      const cancellation = cancellationRef.current;
      if (!cancellation.requested || cancellation.sentTurnId === turnId) {
        return;
      }

      cancellation.sentTurnId = turnId;
      setCancellationState("cancelling");

      void session.cancel({ turnId }).catch((error: unknown) => {
        if (cancellationRef.current !== cancellation) {
          return;
        }

        cancellation.requested = false;
        cancellation.sentTurnId = undefined;
        setCancellationError(toErrorMessage(error));
        setCancellationState("idle");
      });
    },
    [session],
  );

  const handleEvent = useCallback(
    (event: MessageStreamEvent) => {
      if (event.type !== "turn.started") {
        return;
      }

      const cancellation = cancellationRef.current;
      cancellation.turnId = event.data.turnId;
      cancelTurn(event.data.turnId);
    },
    [cancelTurn],
  );

  const agent = useEveAgent({ onEvent: handleEvent, session });
  const isBusy = agent.status === "submitted" || agent.status === "streaming";
  const isEmpty = agent.data.messages.length === 0;
  const restingEmpty = isEmpty && !demoActive;
  const showConversation = !isEmpty || demoActive;
  const errorMessage = cancellationError ?? agent.error?.message;
  const submitStatus = isBusy && cancellationState !== "idle" ? "submitted" : agent.status;

  const prepareTurn = () => {
    cancellationRef.current = { requested: false };
    setCancellationError(undefined);
    setCancellationState("idle");
  };

  const requestCancellation = () => {
    if (!isBusy || cancellationState !== "idle") {
      return;
    }

    const cancellation = cancellationRef.current;
    cancellation.requested = true;
    setCancellationError(undefined);
    setCancellationState("requested");

    if (cancellation.turnId !== undefined) {
      cancelTurn(cancellation.turnId);
    }
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if ((text.length === 0 && message.files.length === 0) || isBusy) return;

    prepareTurn();

    if (message.files.length === 0) {
      await agent.send({ message: text });
      return;
    }

    const parts: UserContent = [];
    if (text.length > 0) {
      parts.push({ text, type: "text" });
    }
    for (const file of message.files) {
      parts.push({
        data: file.url,
        filename: file.filename,
        mediaType: file.mediaType,
        type: "file",
      });
    }

    await agent.send({ message: parts });
  };

  const sendExample = async (text: string) => {
    if (isBusy) return;
    prepareTurn();
    await agent.send({ message: text });
  };

  const handleCallFinish = async (transcript: string) => {
    setCallOpen(false);
    const clean = transcript.trim();
    if (clean.length === 0) return;

    // Sin keys (DEMO_MODE): respuesta simulada guionada, sin backend.
    if (DEMO_MODE) {
      setDemoActive(true);
      return;
    }

    const framed =
      "Terminé una llamada con un cliente. Transcripción de la conversación (asesor y " +
      `cliente mezclados, inferí quién habla cada cosa): ${clean}. Extraé el perfil de ` +
      "búsqueda del cliente y buscá propiedades en KiteProp.";
    prepareTurn();
    await agent.send({ message: framed });
  };

  const composer = (
    <PromptInputProvider>
      <PromptInput onSubmit={handleSubmit}>
        <PromptInputTextarea placeholder="Contale a Kigent qué busca tu cliente…" />
        {speechSupported ? (
          <InputGroupButton
            aria-label="Iniciar llamada"
            className="text-muted-foreground"
            disabled={isBusy}
            onClick={() => setCallOpen(true)}
            type="button"
            variant="ghost"
          >
            <PhoneIcon className="size-4" />
          </InputGroupButton>
        ) : null}
        <MicButton disabled={isBusy} onStateChange={setMicState} />
        <PromptInputSubmit onStop={requestCancellation} status={submitStatus} />
      </PromptInput>
    </PromptInputProvider>
  );

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      {callOpen ? <CallMode onClose={() => setCallOpen(false)} onFinish={handleCallFinish} /> : null}

      {showConversation ? (
        <header className="flex h-14 shrink-0 items-center justify-center gap-3 pl-4 pr-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
              KIGENT_
            </span>
            <StatusDot status={agent.status} />
          </span>
        </header>
      ) : null}

      {errorMessage ? (
        <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pt-2 sm:px-6">
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm">
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">No se pudo completar el pedido</p>
              <p className="mt-0.5 text-muted-foreground">{errorMessage}</p>
            </div>
          </div>
        </div>
      ) : null}

      {showConversation ? (
        <Conversation className="min-h-0 flex-1">
          <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6 sm:px-6">
            {agent.data.messages.map((message, index) => (
              <AgentMessage
                canRespond={!isBusy}
                isStreaming={
                  agent.status === "streaming" && index === agent.data.messages.length - 1
                }
                key={message.id}
                message={message}
                onInputResponses={(inputResponses) => {
                  prepareTurn();
                  return agent.send({ inputResponses });
                }}
              />
            ))}
            {demoActive ? <CallDemoResponse /> : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      ) : null}

      <div
        className={cn(
          "mx-auto w-full px-4 sm:px-6",
          restingEmpty
            ? "flex max-w-lg flex-1 flex-col items-center justify-center gap-6 pb-[10vh]"
            : "max-w-3xl shrink-0 pb-6",
        )}
      >
        {restingEmpty ? (
          <ConsoleShell
            bodyClassName="space-y-3 p-5 font-mono text-xs sm:text-sm"
            className="w-full"
            subLeft={`Asesor: ${PERSONA.asesor}`}
            subRight="KiteProp"
            timer={
              <span className="font-mono text-xs tabular-nums text-[color:var(--kg-accent)]">
                00:00
              </span>
            }
            title={`${AGENT_NAME} · asistente`}
          >
            <div className="flex items-center gap-2 text-[color:var(--kg-dim)]">
              <span className="text-[color:var(--kg-accent)]">&gt;</span>
              <span>esperando consulta</span>
              <span className="inline-block h-[1.05em] w-[0.5ch] animate-pulse bg-[var(--kg-accent)]" />
            </div>
            <div className="space-y-1.5 border-t border-[color:var(--kg-line)] pt-3">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  className="block w-full truncate text-left text-[color:var(--kg-dim)] transition-colors hover:text-[color:var(--kg-text)] disabled:opacity-50"
                  disabled={isBusy}
                  key={prompt}
                  onClick={() => void sendExample(prompt)}
                  type="button"
                >
                  &gt; {prompt}
                </button>
              ))}
            </div>
            {speechSupported ? (
              <button
                className="flex w-full items-center justify-center gap-2 border border-[color:var(--kg-accent)] px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-[color:var(--kg-accent)] transition-colors hover:bg-[var(--kg-accent)] hover:text-[var(--kg-ink)]"
                onClick={() => setCallOpen(true)}
                type="button"
              >
                <PhoneIcon className="size-3.5" /> Iniciar llamada
              </button>
            ) : null}
          </ConsoleShell>
        ) : null}
        <div className="w-full">
          {micState.recording || micState.error ? (
            <div className="mb-2 flex items-center gap-2 px-1 font-mono text-xs">
              {micState.recording ? (
                <>
                  <span className="size-2 animate-pulse bg-emerald-500" />
                  <span className="text-muted-foreground">escuchando…</span>
                </>
              ) : null}
              {micState.error ? (
                <span className="text-muted-foreground">{micState.error}</span>
              ) : null}
            </div>
          ) : null}
          {composer}
        </div>
      </div>
    </main>
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to cancel the response.";
}

function StatusDot({ status }: { readonly status: AgentStatus }) {
  const isLive = status === "submitted" || status === "streaming";
  const tone =
    status === "error"
      ? "bg-destructive"
      : isLive
        ? "bg-emerald-500"
        : status === "ready"
          ? "bg-muted-foreground"
          : "bg-muted-foreground/50";

  return (
    <span className="relative flex size-1">
      {isLive ? (
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-75",
            tone,
          )}
        />
      ) : null}
      <span className={cn("relative inline-flex size-1 rounded-full transition-colors", tone)} />
    </span>
  );
}
