"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ConversationStatus, Employee } from "@/lib/types";
import { Avatar, DotPill, NexoMark, api, shortWhen } from "./ui";

export interface ConversationItem {
  id: string;
  status: ConversationStatus;
  updatedAt: string;
  employee: string;
  department: string;
  transferReason?: string;
  analystId?: string;
  ticketId?: string;
  lastConfidence?: number;
  lastMessage: string;
  lastRole?: string;
  messages: number;
}

type Filter = "all" | "for_you" | "agent" | "mine" | "closed";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "for_you", label: "Para você" },
  { key: "agent", label: "Com o agent" },
  { key: "mine", label: "Minhas" },
  { key: "closed", label: "Encerradas" },
];

/** Linha de contexto de cada conversa, como no protótipo ("Transferida · INC-20311"). */
export function itemTag(c: ConversationItem, meId: string): { text: string; cls: string } {
  switch (c.status) {
    case "waiting_analyst":
      if (c.transferReason === "sem_seguranca") {
        return { text: `Agent pediu ajuda${c.lastConfidence !== undefined ? ` · confiança ${Math.round(c.lastConfidence * 100)}%` : ""}`, cls: "text-warning-text" };
      }
      return { text: `Transferida${c.ticketId ? ` · ${c.ticketId}` : ""}`, cls: "text-danger-text" };
    case "with_analyst":
      return c.analystId === meId ? { text: "Você está atendendo", cls: "text-primary-text" } : { text: "Outro analista atendendo", cls: "text-ink-3" };
    case "closed":
      return { text: "Encerrada", cls: "text-ink-3" };
    default:
      return { text: "Agent atendendo", cls: "text-ink-3" };
  }
}

/** Layout do console: rail + lista de conversas à esquerda, conteúdo à direita. */
export function ConsoleShell({ user, selectedId, children }: { user: Employee; selectedId?: string; children: React.ReactNode }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ConversationItem[]>();
  const [error, setError] = useState<string>();
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api<{ conversations: ConversationItem[] }>("/api/console/conversations")
        .then((d) => alive && setItems(d.conversations))
        .catch((e: Error) => alive && setError(e.message));
    void load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const counts = {
    for_you: items?.filter((i) => i.status === "waiting_analyst").length ?? 0,
    agent: items?.filter((i) => i.status === "agent").length ?? 0,
    mine: items?.filter((i) => i.status === "with_analyst" && i.analystId === user.id).length ?? 0,
  };
  const shown = items
    ?.filter((i) => {
      if (filter === "for_you") return i.status === "waiting_analyst";
      if (filter === "agent") return i.status === "agent";
      if (filter === "mine") return i.status === "with_analyst" && i.analystId === user.id;
      if (filter === "closed") return i.status === "closed";
      return true;
    })
    .filter((i) => !q || `${i.employee} ${i.ticketId ?? ""} ${i.lastMessage}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex h-dvh">
      <aside className="flex w-16 shrink-0 flex-col items-center gap-1.5 border-r border-rule bg-desk py-4">
        <div className="flex h-10 w-10 items-center justify-center pb-2">
          <NexoMark size={22} />
        </div>
        <Link href="/console" className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-paper shadow-[0_1px_2px_rgba(27,36,49,.08)]" title="Conversas">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
          </svg>
          {counts.for_you > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-desk bg-cta px-1 text-[10px] font-bold text-white">{counts.for_you}</span>
          )}
        </Link>
        <Link href="/chat" title="Meu atendimento" className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-3 hover:bg-paper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
        </Link>
        <div className="flex-1" />
        <div className="relative">
          <button type="button" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} title={user.name} className="rounded-full">
            <Avatar name={user.name} size={36} online />
          </button>
          {menu && (
            <>
              <button type="button" aria-label="Fechar menu" onClick={() => setMenu(false)} className="fixed inset-0 z-10 cursor-default" />
              <div role="menu" className="absolute bottom-0 left-12 z-20 w-60 rounded-xl border border-line-card bg-paper p-1.5 shadow-[0_8px_24px_-8px_rgba(27,36,49,.3)]">
                <div className="flex items-center gap-2.5 px-2 pb-2 pt-1.5">
                  <Avatar name={user.name} />
                  <div className="min-w-0 leading-tight">
                    <div className="truncate text-[13.5px] font-semibold">{user.name}</div>
                    <div className="truncate text-[11.5px] text-ink-3">{user.email}</div>
                  </div>
                </div>
                <div className="border-t border-rule pt-1.5">
                  <MenuItem href="/perfil">Meu perfil</MenuItem>
                  <MenuItem href="/chamados">Meu atendimento</MenuItem>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      await fetch("/api/auth", { method: "DELETE" });
                      router.push("/login");
                    }}
                    className="flex h-9 w-full items-center rounded-lg px-2.5 text-left text-[13.5px] font-medium text-ink-2 hover:bg-desk"
                  >
                    Sair
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      <aside className="hidden w-[380px] shrink-0 flex-col border-r border-rule lg:flex">
        <div className="space-y-3 px-4 pb-2.5 pt-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Conversas</h1>
            <DotPill tone="success">Disponível</DotPill>
          </div>
          <label className="flex h-9 items-center gap-2.5 rounded-full bg-desk px-3 text-[13.5px]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-ink-3" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar conversa ou chamado" className="flex-1 bg-transparent placeholder:text-ink-3 focus:outline-none" />
          </label>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => {
              const n = f.key === "for_you" ? counts.for_you : f.key === "agent" ? counts.agent : f.key === "mine" ? counts.mine : undefined;
              const active = filter === f.key;
              return (
                <button key={f.key} type="button" onClick={() => setFilter(f.key)} className={`flex items-center gap-1.5 rounded-full px-[9px] py-1.5 text-[12.5px] font-medium ${active || (f.key === "for_you" && filter === "all" && n) ? "bg-primary-soft text-primary-text" : "bg-desk text-ink-2 hover:bg-rule/70"}`}>
                  {f.label}
                  {n !== undefined && n > 0 && <span className={`font-semibold ${active ? "text-primary-text" : "text-ink-3"}`}>{n}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          {error && <p className="p-3 text-[13.5px] text-danger-text">{error}</p>}
          {!items && !error && <p className="p-3 text-[13.5px] text-ink-3">Carregando…</p>}
          {shown?.length === 0 && <p className="p-3 text-[13.5px] text-ink-3">Nenhuma conversa.</p>}
          {shown?.map((c) => {
            const tag = itemTag(c, user.id);
            const attention = c.status === "waiting_analyst";
            return (
              <Link key={c.id} href={`/console/${c.id}`} className={`flex gap-3 rounded-xl p-2.5 ${c.id === selectedId ? "bg-desk" : "hover:bg-desk/60"}`}>
                <Avatar name={c.employee} size={46} online={c.status !== "closed"} />
                <div className="min-w-0 flex-1 space-y-[3px] border-b border-rule pb-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`truncate text-[15.5px] ${attention ? "font-semibold" : "font-medium"}`}>{c.employee}</span>
                    <span className={`shrink-0 text-[12.5px] ${attention ? "font-semibold text-cta" : "text-ink-3"}`}>{shortWhen(c.updatedAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-3">
                      {c.lastRole === "assistant" ? "Nexo: " : c.lastRole === "analyst" ? "Analista: " : ""}
                      {c.lastMessage || "(sem mensagens)"}
                    </span>
                    {attention && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cta px-1.5 text-[11.5px] font-bold text-white">!</span>}
                  </div>
                  <div className={`text-[11.5px] font-medium ${tag.cls}`}>{tag.text}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 bg-desk-2">{children}</section>
    </div>
  );
}

function MenuItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} role="menuitem" className="flex h-9 items-center rounded-lg px-2.5 text-[13.5px] font-medium text-ink-2 hover:bg-desk">
      {children}
    </Link>
  );
}
