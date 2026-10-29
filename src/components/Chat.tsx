"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Conversation, Employee, Message } from "@/lib/types";
import { MAX_USER_MESSAGES } from "@/lib/types";
import type { AgentEvent } from "@/mastra/run";
import { AppShell } from "./AppShell";
import { MessageList, type Streaming } from "./Messages";
import { DotPill, StatusPill, api } from "./ui";

const SUGGESTIONS = ["Qual o status do meu chamado?", "Minha VPN dá erro 809", "Preciso de um segundo monitor", "Qual o horário do service desk?"];

export function Chat({ user, initialId }: { user: Employee; initialId?: string }) {
  const [conv, setConv] = useState<Conversation>();
  const [streaming, setStreaming] = useState<Streaming | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string>();
  const [agent, setAgent] = useState<{ ok: boolean; reason?: string }>({ ok: true });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async (id?: string) => {
    const url = id ? `/api/conversations/${id}` : "/api/conversations";
    const data = await api<{ conversation: Conversation; agent: { ok: boolean; reason?: string } }>(url);
    setConv(data.conversation);
    setAgent(data.agent);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState só após o fetch
    refresh(initialId).catch((e: Error) => setError(e.message));
  }, [refresh, initialId]);

  // Polling simples para receber mensagens do analista e mudanças de status.
  useEffect(() => {
    if (!conv || streaming || conv.status === "closed") return;
    const t = setInterval(() => refresh(conv.id).catch(() => undefined), conv.status === "agent" ? 8000 : 3000);
    return () => clearInterval(t);
  }, [conv, streaming, refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages.length, streaming?.text, streaming?.blocks.length]);

  const userCount = conv?.messages.filter((m) => m.role === "user").length ?? 0;
  const canSend = !!conv && conv.status !== "closed" && !streaming && userCount < MAX_USER_MESSAGES;

  const send = useCallback(
    async (text: string) => {
      if (!conv || !canSend || !text.trim()) return;
      setError(undefined);
      setInput("");
      const optimistic: Conversation = { ...conv, messages: [...conv.messages, pendingMessage(text)] };
      setConv(optimistic);
      if (conv.status === "agent") setStreaming({ text: "", steps: [], blocks: [] });
      try {
        const res = await fetch(`/api/conversations/${conv.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        });
        if (!res.headers.get("content-type")?.includes("text/event-stream")) {
          const data = (await res.json()) as { error?: string; conversation?: Conversation };
          if (data.conversation) setConv(data.conversation);
          if (!res.ok) setError(data.error ?? "Erro ao enviar");
          return;
        }
        await readSse(res, (ev) => {
          if (ev.type === "text") setStreaming((s) => s && { ...s, text: s.text + ev.delta });
          else if (ev.type === "step") setStreaming((s) => s && { ...s, steps: [...s.steps, ev.label] });
          else if (ev.type === "block") setStreaming((s) => s && { ...s, blocks: [...s.blocks, ev.block] });
          else if (ev.type === "error") setError(`O agent não conseguiu responder: ${ev.message}`);
        });
        await refresh(conv.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro de conexão");
        await refresh(conv.id).catch(() => undefined);
      } finally {
        setStreaming(null);
      }
    },
    [conv, canSend, refresh],
  );

  // Atalhos do protótipo: 1–5 escolhe uma opção rápida; Ctrl/⌘+Enter confirma o rascunho pendente.
  useEffect(() => {
    if (!conv || !canSend) return;
    const last = [...conv.messages].reverse().find((m) => m.role === "assistant");
    const options = last?.blocks?.find((b) => b.type === "options");
    const draft = last?.blocks?.find((b) => b.type === "draft");
    const onKey = (e: KeyboardEvent) => {
      const typing = document.activeElement === inputRef.current && input.length > 0;
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && draft?.type === "draft" && !draft.draft.applied) {
        e.preventDefault();
        void send(`Confirmo o rascunho ${draft.draft.id}, pode registrar.`);
      } else if (!typing && !e.ctrlKey && !e.metaKey && options?.type === "options" && /^[1-5]$/.test(e.key)) {
        const o = options.options[Number(e.key) - 1];
        if (o) {
          e.preventDefault();
          void send(o);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [conv, canSend, input, send]);

  async function newConversation() {
    const { conversation } = await api<{ conversation: Conversation }>("/api/conversations", { method: "POST" });
    setConv(conversation);
    setError(undefined);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  const actions = {
    send: (t: string) => void send(t),
    prefill: (t: string) => {
      setInput(t);
      inputRef.current?.focus();
    },
  };

  return (
    <AppShell
      user={user}
      crumb="Atendimento"
      status={
        <>
          <Link href="/chamados" className="text-[13.5px] font-medium text-ink-2 hover:text-primary-text">
            Minhas conversas
          </Link>
          <button type="button" onClick={newConversation} className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-paper px-3 text-[13.5px] font-medium text-ink-2 hover:border-primary hover:bg-primary-soft hover:text-primary-text">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nova conversa
          </button>
          {conv && conv.status === "agent" && !agent.ok ? (
            <span title={`O assistente não está disponível: a configuração do provedor de IA não está correta. ${agent.reason ?? ""} Corrija o .env e reinicie a aplicação.`} className="cursor-help">
              <DotPill tone="danger">Assistente offline</DotPill>
            </span>
          ) : (
            conv && <StatusPill status={conv.status} />
          )}
        </>
      }
    >
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[760px] px-5 pb-1 pt-7">
          {!conv ? (
            <p className="text-[13.5px] text-ink-3">Carregando…</p>
          ) : conv.messages.length === 0 ? (
            <div className="space-y-4 pt-10">
              <h1 className="font-display text-[34px] leading-tight">O que está acontecendo?</h1>
              <p className="max-w-lg text-[14.5px] text-ink-3">
                Descreva com suas palavras. Eu consulto seus chamados, busco na central de ajuda, abro ou atualizo chamados e chamo um
                analista quando precisar.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="rounded-lg border border-rule bg-paper px-3 py-[7px] text-[13.5px] font-medium hover:border-primary hover:bg-primary-soft hover:text-primary-text">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <MessageList messages={conv.messages} streaming={streaming} actions={actions} activeBlocks={conv.status === "agent"} />
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="shrink-0">
        <div className="mx-auto max-w-[760px] space-y-1.5 px-5 pb-[18px] pt-2.5">
          {conv?.status === "waiting_analyst" && <Banner tone="warning">Um analista vai assumir esta conversa em instantes. O Nexo Assist está pausado; você pode continuar escrevendo.</Banner>}
          {conv?.status === "with_analyst" && <Banner tone="success">Você está falando com um analista do service desk.</Banner>}
          {conv?.status === "closed" && (
            <Banner tone="neutral">
              Esta conversa foi encerrada.{" "}
              <button type="button" onClick={newConversation} className="font-semibold text-primary-text hover:underline">
                Começar uma nova
              </button>
            </Banner>
          )}
          {error && (
            <p className="text-[13.5px] text-danger-text" role="alert">
              {error}
            </p>
          )}
          <form onSubmit={submit} className="flex min-h-12 items-end gap-2 rounded-xl border border-line bg-paper py-1.5 pl-4 pr-1.5 focus-within:border-cta focus-within:ring-2 focus-within:ring-cta/15">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              disabled={!canSend}
              placeholder={canSend ? "Escreva para o Nexo…" : "Aguarde…"}
              className="max-h-40 min-h-[34px] flex-1 resize-none bg-transparent py-[7px] text-[14.5px] placeholder:text-ink-3 focus:outline-none disabled:text-ink-3"
            />
            <button type="submit" disabled={!canSend || !input.trim()} className="flex h-9 items-center gap-1.5 rounded-md bg-cta px-3 text-[13.5px] font-semibold text-white hover:bg-cta-hover disabled:opacity-50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m22 2-7 20-4-9-9-4Z" />
              </svg>
              Enviar
            </button>
          </form>
          <div className="text-right text-[12.5px] text-ink-3">
            {userCount}/{MAX_USER_MESSAGES} mensagens nesta sessão
          </div>
        </div>
      </footer>
    </AppShell>
  );
}

const pendingMessage = (content: string): Message => ({ id: `tmp-${Date.now()}`, role: "user", content, at: new Date().toISOString() });

function Banner({ tone, children }: { tone: "warning" | "success" | "neutral"; children: React.ReactNode }) {
  const cls = { warning: "bg-warning-soft text-warning-text", success: "bg-success-soft text-success-text", neutral: "bg-desk text-ink-2" }[tone];
  return <div className={`rounded-lg px-3 py-2 text-[13.5px] ${cls}`}>{children}</div>;
}

/** Lê um stream SSE (`data: {...}\n\n`) e chama onEvent por evento. */
async function readSse(res: Response, onEvent: (e: AgentEvent) => void): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const p of parts) {
      const line = p.split("\n").find((l) => l.startsWith("data: "));
      if (line) onEvent(JSON.parse(line.slice(6)) as AgentEvent);
    }
  }
}
