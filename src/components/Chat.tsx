"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Conversation, Employee, Message } from "@/lib/types";
import { MAX_USER_MESSAGES } from "@/lib/types";
import type { AgentEvent } from "@/mastra/run";
import { MessageList, type Streaming } from "./Messages";
import { ConversationBadge, api } from "./ui";

const SUGGESTIONS = ["Como está meu chamado?", "Minha VPN dá erro 809", "Preciso de um segundo monitor", "Qual o horário do service desk?"];

export function Chat({ user }: { user: Employee }) {
  const router = useRouter();
  const [conv, setConv] = useState<Conversation>();
  const [streaming, setStreaming] = useState<Streaming | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string>();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async (id?: string) => {
    const url = id ? `/api/conversations/${id}` : "/api/conversations";
    const { conversation } = await api<{ conversation: Conversation }>(url);
    setConv(conversation);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState só após o fetch
    refresh().catch((e: Error) => setError(e.message));
  }, [refresh]);

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

  async function send(text: string) {
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
  }

  async function newConversation() {
    const { conversation } = await api<{ conversation: Conversation }>("/api/conversations", { method: "POST" });
    setConv(conversation);
    setError(undefined);
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
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
    <div className="flex h-dvh flex-col">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">N</span>
          <div className="leading-tight">
            <div className="font-semibold">Nexo Assist</div>
            <div className="text-xs text-slate-500">Service desk de TI</div>
          </div>
          {conv && <ConversationBadge status={conv.status} />}
          <div className="ml-auto flex items-center gap-3 text-sm">
            <button type="button" onClick={newConversation} className="text-indigo-600 hover:underline">
              Nova conversa
            </button>
            <span className="hidden text-slate-500 sm:inline">{user.name}</span>
            <button type="button" onClick={logout} className="text-slate-500 hover:underline">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {!conv ? (
            <p className="text-sm text-slate-500">Carregando…</p>
          ) : conv.messages.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h1 className="text-lg font-semibold">Oi, {user.name.split(" ")[0]}. Como posso ajudar?</h1>
              <p className="mt-1 text-sm text-slate-600">
                Descreva com suas palavras. Eu consulto seus chamados, busco na central de ajuda, abro ou atualizo chamados e chamo um
                analista quando precisar.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm hover:border-indigo-400 hover:text-indigo-700"
                  >
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

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-3xl px-4 py-3">
          {conv?.status === "waiting_analyst" && (
            <Banner tone="amber">Um analista vai assumir esta conversa em instantes. O Nexo Assist está pausado; você pode continuar escrevendo.</Banner>
          )}
          {conv?.status === "with_analyst" && <Banner tone="emerald">Você está falando com um analista do service desk.</Banner>}
          {conv?.status === "closed" && (
            <Banner tone="slate">
              Esta conversa foi encerrada.{" "}
              <button type="button" onClick={newConversation} className="font-medium text-indigo-600 hover:underline">
                Começar uma nova
              </button>
            </Banner>
          )}
          {error && (
            <p className="mb-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <form onSubmit={submit} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              disabled={!canSend}
              placeholder={canSend ? "Escreva sua mensagem…" : "Aguarde…"}
              className="max-h-40 min-h-[42px] flex-1 resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={!canSend || !input.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
          <div className="mt-1 text-right text-xs text-slate-400">
            {userCount}/{MAX_USER_MESSAGES} mensagens nesta conversa
          </div>
        </div>
      </footer>
    </div>
  );
}

const pendingMessage = (content: string): Message => ({ id: `tmp-${Date.now()}`, role: "user", content, at: new Date().toISOString() });

function Banner({ tone, children }: { tone: "amber" | "emerald" | "slate"; children: React.ReactNode }) {
  const cls = { amber: "bg-amber-50 text-amber-800", emerald: "bg-emerald-50 text-emerald-800", slate: "bg-slate-100 text-slate-700" }[tone];
  return <div className={`mb-2 rounded-lg px-3 py-2 text-sm ${cls}`}>{children}</div>;
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
