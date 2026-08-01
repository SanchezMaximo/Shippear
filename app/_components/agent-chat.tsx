"use client";

import type { UserContent } from "ai";
import { Client, type MessageStreamEvent } from "eve/client";
import { useEveAgent } from "eve/react";
import { AlertCircleIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";
import { AgentMessage } from "./agent-message";

const AGENT_NAME = "Kigent";

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

  const composer = (
    <PromptInput onSubmit={handleSubmit}>
      <PromptInputTextarea placeholder="Contale a Kigent qué busca tu cliente…" />
      <PromptInputSubmit onStop={requestCancellation} status={submitStatus} />
    </PromptInput>
  );

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      {isEmpty ? null : (
        <header className="flex h-14 shrink-0 items-center justify-center gap-3 pl-4 pr-2">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-muted-foreground text-sm">{AGENT_NAME}</span>
            <StatusDot status={agent.status} />
          </span>
        </header>
      )}

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

      {isEmpty ? null : (
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
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      <div
        className={cn(
          "mx-auto w-full px-4 sm:px-6",
          isEmpty
            ? "flex max-w-xl flex-1 flex-col items-center justify-center gap-8 pb-[10vh]"
            : "max-w-3xl shrink-0 pb-6",
        )}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="font-medium text-5xl tracking-tighter">{AGENT_NAME}</h1>
            <p className="text-balance text-muted-foreground text-sm">
              Contame qué busca tu cliente y armo la propuesta con propiedades de KiteProp.
            </p>
          </div>
        ) : null}
        <div className="w-full">{composer}</div>
        {isEmpty ? (
          <div className="flex w-full flex-col gap-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                className="rounded-lg border border-border bg-card px-3 py-2 text-left text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                disabled={isBusy}
                key={prompt}
                onClick={() => void sendExample(prompt)}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}
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
