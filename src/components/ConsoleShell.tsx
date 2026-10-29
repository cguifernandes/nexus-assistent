"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ConversationStatus, Employee } from "@/lib/types";
import { ConversationBadge, STATUS_LABEL, api, timeAgo } from "./ui";

interface Item {
  id: string;
  status: ConversationStatus;
  updatedAt: string;
  employee: string;
  department: string;
  transferReason?: string;
  lastMessage: string;
  messages: number;
}

const FILTERS: { key: ConversationStatus | "all"; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "waiting_analyst", label: STATUS_LABEL.waiting_analyst },
  { key: "with_analyst", label: STATUS_LABEL.with_analyst },
  { key: "agent", label: STATUS_LABEL.agent },
  { key: "closed", label: STATUS_LABEL.closed },
];

const REASON: Record<string, string> = {
  pedido_do_funcionario: "pediu um analista",
  caso_critico: "caso crítico",
  chamado_vencido: "chamado vencido",
  sem_seguranca: "agent sem segurança",
  outro: "transferida",
};

/** Layout do console: lista de conversas à esquerda, conteúdo à direita. */
export function ConsoleShell({ user, selectedId, children }: { user: Employee; selectedId?: string; children: React.ReactNode }) {
  const router = useRouter();
  const [filter, setFilter] = useState<ConversationStatus | "all">("all");
  const [items, setItems] = useState<Item[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let alive = true;
    const load = () =>
      api<{ conversations: Item[] }>(`/api/console/conversations${filter === "all" ? "" : `?status=${filter}`}`)
        .then((d) => alive && setItems(d.conversations))
        .catch((e: Error) => alive && setError(e.message));
    void load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [filter]);

  const waiting = items?.filter((i) => i.status === "waiting_analyst").length ?? 0;

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-3 border-b bg-white px-4 py-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 font-bold text-white">N</span>
        <div className="leading-tight">
          <div className="font-semibold">Console do analista</div>
          <div className="text-xs text-slate-500">Nexo Assist · service desk de TI</div>
        </div>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-slate-500">
            {user.name} · {user.department}
          </span>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth", { method: "DELETE" });
              router.push("/login");
            }}
            className="text-slate-500 hover:underline"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-80 shrink-0 flex-col border-r bg-white">
          <div className="flex flex-wrap gap-1 border-b p-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-2.5 py-1 text-xs ${
                  filter === f.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {f.label}
                {f.key === "waiting_analyst" && waiting > 0 && filter === "all" && (
                  <span className="ml-1 rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{waiting}</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {error && <p className="p-3 text-sm text-red-600">{error}</p>}
            {!items && !error && <p className="p-3 text-sm text-slate-500">Carregando…</p>}
            {items?.length === 0 && <p className="p-3 text-sm text-slate-500">Nenhuma conversa.</p>}
            {items?.map((c) => (
              <Link
                key={c.id}
                href={`/console/${c.id}`}
                className={`block border-b px-3 py-2.5 hover:bg-slate-50 ${c.id === selectedId ? "bg-indigo-50" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-sm">{c.employee}</span>
                  <span className="text-xs text-slate-400">{timeAgo(c.updatedAt)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <ConversationBadge status={c.status} />
                  {c.transferReason && c.status !== "closed" && (
                    <span className="truncate text-xs text-slate-500">{REASON[c.transferReason] ?? c.transferReason}</span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">{c.lastMessage || "(sem mensagens)"}</p>
              </Link>
            ))}
          </div>
        </aside>
        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </div>
  );
}
