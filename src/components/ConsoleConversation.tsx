"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Conversation, Employee, TicketView } from "@/lib/types";
import { ConsoleMessageList } from "./Messages";
import { Avatar, DotPill, PRIORITY_DOT, TicketStatusDot, api, fmtTime, shortWhen } from "./ui";

interface Data {
  conversation: Conversation;
  employee?: Employee;
  analyst?: Employee;
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

  if (!data) return <div className="p-6 text-[13.5px] text-ink-3">{error ?? "Carregando…"}</div>;
  const { conversation: c, employee, analyst, tickets, ticketsError } = data;
  const name = employee?.name ?? c.employeeId;
  const first = name.split(" ")[0];
  const mine = c.status === "with_analyst" && c.analystId === me.id;
  const current = tickets?.find((t) => t.id === c.ticketId);
  const others = tickets?.filter((t) => t.id !== c.ticketId) ?? [];
  const openCount = tickets?.filter((t) => t.open).length ?? 0;

  return (
    <>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-rule bg-paper pl-5 pr-4">
          <Avatar name={name} size={40} />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[15.5px] font-semibold">{name}</div>
            <div className="truncate text-[12.5px] text-ink-3">
              {c.status === "closed" ? "offline" : "online"} · {employee?.department}
              {c.ticketId && ` · ${c.ticketId}`}
            </div>
          </div>
          {mine ? (
            <>
              <Btn disabled={busy} onClick={() => act("return")}>
                Devolver ao agent
              </Btn>
              <Btn tone="danger" disabled={busy} onClick={() => act("close")}>
                Encerrar atendimento
              </Btn>
            </>
          ) : (
            <>
              <DotPill tone={c.status === "waiting_analyst" ? "warning" : c.status === "with_analyst" ? "primary" : c.status === "closed" ? "neutral" : "success"}>
                {c.status === "waiting_analyst" ? "Aguardando atendente" : c.status === "with_analyst" ? `Com ${analyst?.name ?? "outro analista"}` : c.status === "closed" ? "Encerrada" : "Agent atendendo"}
              </DotPill>
              {c.status !== "closed" && (
                <Btn tone="ghost" disabled={busy} onClick={() => act("close")}>
                  Encerrar
                </Btn>
              )}
            </>
          )}
        </div>

        {c.summary && (
          <div className="border-b border-rule bg-warning-soft px-5 py-2 text-[13px] text-warning-text">
            <span className="font-semibold">Resumo do agent:</span> {c.summary}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-10 pb-4 pt-3">
          <ConsoleMessageList messages={c.messages} analystName={() => analyst?.name ?? "Analista"} />
          <div ref={bottomRef} />
        </div>

        <div className="space-y-2.5 border-t border-rule bg-paper px-5 pb-3.5 pt-3">
          {error && <p className="text-[13.5px] text-danger-text">{error}</p>}
          {mine ? (
            <form onSubmit={submit} className="flex items-center gap-3">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Responder para ${first}…`} autoFocus className="h-11 flex-1 rounded-xl bg-desk px-3.5 text-[14.5px] placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-cta/20" />
              <button type="submit" disabled={busy || !input.trim()} aria-label="Enviar" className="flex h-11 w-11 items-center justify-center rounded-full bg-cta text-white hover:bg-cta-hover disabled:opacity-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m22 2-7 20-4-9-9-4Z" />
                </svg>
              </button>
            </form>
          ) : (
            <>
              {c.status !== "closed" && (
                <div className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${c.status === "waiting_analyst" ? "bg-warning-soft text-warning-text" : "bg-primary-soft text-primary-text"}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 8v4l3 2" />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="text-[14.5px] font-semibold">
                      {c.status === "waiting_analyst" ? `${first} espera um atendente` : c.status === "with_analyst" ? `${analyst?.name ?? "Outro analista"} está atendendo` : `O agent está atendendo ${first}`}
                    </div>
                    <div className="text-[12.5px] text-ink-3">
                      {c.status === "agent" ? "Assuma para intervir; o agent é pausado." : `Agent pausado · desde ${fmtTime(c.updatedAt)}`}
                    </div>
                  </div>
                  <Btn tone="primary" disabled={busy} onClick={() => act("takeover")}>
                    Assumir atendimento
                  </Btn>
                </div>
              )}
              <div className="flex h-11 items-center rounded-xl bg-desk px-3.5 text-[14.5px] text-ink-3">
                {c.status === "closed" ? "Conversa encerrada." : "Assuma o atendimento para responder"}
              </div>
            </>
          )}
        </div>
      </div>

      <aside className="hidden w-[340px] shrink-0 flex-col border-l border-rule bg-paper xl:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-rule px-5 leading-tight">
          <div>
            <div className="text-[15.5px] font-semibold">Chamados d{first?.endsWith("a") ? "a" : "e"} {first}</div>
            <div className="text-[12.5px] text-ink-3">{tickets ? `${openCount} abertos · ${tickets.length - openCount} encerrados` : "sistema de chamados indisponível"}</div>
          </div>
        </div>
        <div className="flex-1 space-y-8 overflow-y-auto px-5 pb-5 pt-6">
          {tickets === null ? (
            <div className="text-[13.5px] text-warning-text">
              {ticketsError ?? "Sistema de chamados indisponível."}{" "}
              <button type="button" onClick={load} className="font-semibold text-primary-text hover:underline">
                Tentar de novo
              </button>
            </div>
          ) : (
            <>
              {current && (
                <section className="space-y-3">
                  <h3 className="text-[12.5px] font-semibold text-ink-3">Desta conversa</h3>
                  <div className="space-y-3.5 rounded-xl bg-desk p-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[12.5px] font-medium text-ink-3">{current.id}</span>
                        <TicketStatusDot status={current.status} strong />
                      </div>
                      <div className="text-[15.5px] font-semibold leading-snug">{current.title}</div>
                      <div className="flex items-center gap-1.5 text-[13.5px] text-ink-3">
                        {current.category} ·<span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[current.priority]}`} />
                        prioridade {current.priority.toLowerCase()}
                        {current.overdue && <span className="text-warning-text">· vencido</span>}
                      </div>
                    </div>
                    {current.history.at(-1) && (
                      <div className="flex items-start justify-between gap-2 border-t border-rule pt-3 text-[13.5px]">
                        <span className="text-ink-2">{current.history.at(-1)!.text}</span>
                        <span className="shrink-0 text-[12.5px] text-ink-3">{shortWhen(current.history.at(-1)!.at)}</span>
                      </div>
                    )}
                  </div>
                </section>
              )}
              <section className="space-y-1">
                <h3 className="pb-1 text-[12.5px] font-semibold text-ink-3">{current ? "Outros chamados" : "Chamados"}</h3>
                {others.length === 0 && <p className="text-[13.5px] text-ink-3">Nenhum outro chamado.</p>}
                {others.map((t, i) => (
                  <div key={t.id} className={`space-y-[3px] py-3 ${i < others.length - 1 ? "border-b border-rule" : ""}`}>
                    <div className="text-[14.5px] font-medium leading-snug">{t.title}</div>
                    <div className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
                      <span className="font-mono">{t.id}</span>· {t.open ? t.status : `${t.status} em ${shortWhen(t.updatedAt)}`}
                      {t.overdue && <span className="text-warning-text">· vencido</span>}
                    </div>
                  </div>
                ))}
              </section>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function Btn({ tone = "outline", children, ...rest }: { tone?: "primary" | "outline" | "danger" | "ghost"; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = {
    primary: "bg-cta text-white hover:bg-cta-hover",
    outline: "border border-line bg-paper text-ink-2 hover:bg-desk",
    danger: "bg-danger-soft text-danger-text hover:bg-danger/20",
    ghost: "text-ink-2 hover:bg-desk",
  }[tone];
  return (
    <button type="button" {...rest} className={`h-9 shrink-0 rounded-lg px-3.5 text-[13.5px] font-semibold disabled:opacity-50 ${cls}`}>
      {children}
    </button>
  );
}
