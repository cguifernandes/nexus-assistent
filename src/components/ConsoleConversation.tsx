"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Conversation, Employee, TicketView } from "@/lib/types";
import { TicketCard } from "./Blocks";
import { MessageList } from "./Messages";
import { ConversationBadge, api } from "./ui";

interface Data {
  conversation: Conversation;
  employee?: Employee;
  tickets: TicketView[] | null;
  ticketsError?: string;
}

export function ConsoleConversation({ id, me }: { id: string; me: Employee }) {
  const [data, setData] = useState<Data>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => api<Data>(`/api/console/conversations/${id}`).then(setData).catch((e: Error) => setError(e.message)), [id]);

  useEffect(() => {
    void load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.conversation.messages.length]);

  async function act(action: "takeover" | "return" | "close" | "message", content?: string) {
    setBusy(true);
    setError(undefined);
    try {
      setData(await api<Data>(`/api/console/conversations/${id}`, { method: "POST", body: JSON.stringify({ action, content }) }));
      if (action === "message") setInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (input.trim()) void act("message", input);
  }

  if (!data) return <div className="p-6 text-sm text-slate-500">{error ?? "Carregando…"}</div>;
  const { conversation: c, employee, tickets, ticketsError } = data;
  const mine = c.status === "with_analyst" && c.analystId === me.id;

  return (
    <div className="flex h-full min-w-0">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-3 border-b bg-white px-4 py-2.5">
          <div className="leading-tight">
            <div className="font-semibold">{employee?.name ?? c.employeeId}</div>
            <div className="text-xs text-slate-500">
              {employee?.email} · {employee?.department}
            </div>
          </div>
          <ConversationBadge status={c.status} />
          <div className="ml-auto flex gap-2">
            {(c.status === "waiting_analyst" || c.status === "agent" || (c.status === "with_analyst" && !mine)) && (
              <Btn primary disabled={busy} onClick={() => act("takeover")}>
                Assumir atendimento
              </Btn>
            )}
            {mine && (
              <Btn disabled={busy} onClick={() => act("return")}>
                Devolver ao agent
              </Btn>
            )}
            {c.status !== "closed" && (
              <Btn disabled={busy} onClick={() => act("close")}>
                Encerrar
              </Btn>
            )}
          </div>
        </div>

        {c.summary && (
          <div className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-900">
            <span className="font-medium">Resumo do agent:</span> {c.summary}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <MessageList messages={c.messages} activeBlocks={false} />
          <div ref={bottomRef} />
        </div>

        <div className="border-t bg-white px-4 py-3">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          {mine ? (
            <form onSubmit={submit} className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Responder ao funcionário…"
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Btn primary disabled={busy || !input.trim()} type="submit">
                Enviar
              </Btn>
            </form>
          ) : (
            <p className="text-sm text-slate-500">
              {c.status === "closed"
                ? "Conversa encerrada."
                : c.status === "with_analyst"
                  ? "Outro analista está atendendo."
                  : c.status === "waiting_analyst"
                    ? "O Nexo Assist está pausado. Assuma o atendimento para responder."
                    : "Conversa com o agent. Assuma o atendimento para intervir."}
            </p>
          )}
        </div>
      </div>

      <aside className="w-80 shrink-0 overflow-y-auto border-l bg-white p-4">
        <h3 className="text-sm font-semibold">Chamados do funcionário</h3>
        {tickets === null ? (
          <div className="mt-2 text-sm text-amber-700">
            {ticketsError ?? "Sistema de chamados indisponível."}{" "}
            <button type="button" onClick={load} className="font-medium text-indigo-600 hover:underline">
              Tentar de novo
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nenhum chamado.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {tickets.map((t) => (
              <TicketCard key={t.id} ticket={t} />
            ))}
          </div>
        )}
        {c.drafts.length > 0 && (
          <p className="mt-4 text-xs text-slate-500">
            {c.drafts.length} rascunho(s) nesta conversa · {c.drafts.filter((d) => d.applied).length} registrado(s)
          </p>
        )}
      </aside>
    </div>
  );
}

function Btn({
  primary,
  children,
  ...rest
}: { primary?: boolean; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
        primary ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-slate-300 bg-white hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}
