import type { ConversationStatus, Priority, TicketStatus } from "@/lib/types";

export const STATUS_LABEL: Record<ConversationStatus, string> = {
  agent: "Com o agent",
  waiting_analyst: "Aguardando atendente",
  with_analyst: "Em atendimento",
  closed: "Encerrada",
};

const STATUS_CLASS: Record<ConversationStatus, string> = {
  agent: "bg-slate-100 text-slate-700",
  waiting_analyst: "bg-amber-100 text-amber-800",
  with_analyst: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-200 text-slate-500",
};

export function ConversationBadge({ status }: { status: ConversationStatus }) {
  return <Badge className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</Badge>;
}

const PRIORITY_CLASS: Record<Priority, string> = {
  Crítica: "bg-red-100 text-red-800",
  Alta: "bg-orange-100 text-orange-800",
  Média: "bg-sky-100 text-sky-800",
  Baixa: "bg-slate-100 text-slate-700",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge className={PRIORITY_CLASS[priority]}>{priority}</Badge>;
}

const TICKET_STATUS_CLASS: Partial<Record<TicketStatus, string>> = {
  Resolvido: "bg-emerald-100 text-emerald-800",
  Fechado: "bg-slate-200 text-slate-600",
  Aprovado: "bg-emerald-50 text-emerald-700",
  "Aguardando analista": "bg-amber-100 text-amber-800",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return <Badge className={TICKET_STATUS_CLASS[status] ?? "bg-indigo-50 text-indigo-700"}>{status}</Badge>;
}

export function Badge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${className}`}>
      {children}
    </span>
  );
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "há 1 dia" : `há ${d} dias`;
}

export const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-500">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
      {label}
    </span>
  );
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`);
  return data;
}
