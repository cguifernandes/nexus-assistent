import type { ConversationStatus, Priority, TicketStatus } from "@/lib/types";

/** Marca da Nexo (path do protótipo). */
export function NexoMark({ size = 20, color = "#037AF6" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size * (20.64 / 24.39)} viewBox="0 0 24.39 20.64" aria-hidden="true">
      <path
        fill={color}
        d="M21.763 0.24493l-3.374 1.687c-0.623 0.308-0.973 0.903-0.973 1.631l0 6.293-11.193-9.429c-0.623-0.469-1.372-0.553-2.03-0.245l-3.185 1.631c-0.651 0.322-1.008 0.924-1.008 1.673l0 15.218c0 1.477 1.526 2.289 2.716 1.785l3.073-1.617c0.693-0.322 1.057-0.952 1.057-1.722l0-7.7 11.732 10.591c0.602 0.546 1.421 0.679 2.086 0.364l2.786-1.505c0.602-0.315 0.938-0.931 0.938-1.68l0-15.288c0-1.463-1.505-2.275-2.625-1.687z"
      />
    </svg>
  );
}

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

const AVATAR_PALETTE = [
  ["#DCE9F7", "#0062C4"],
  ["#F6E3D3", "#9A4A12"],
  ["#E6E1F7", "#5B3FC4"],
  ["#DDF0E6", "#1E7A4C"],
  ["#F7E1E6", "#A3324F"],
  ["#E5E8EC", "#3D4656"],
  ["#FBEFD0", "#8A6100"],
] as const;

export function avatarColors(name: string): { bg: string; fg: string } {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [bg, fg] = AVATAR_PALETTE[h % AVATAR_PALETTE.length]!;
  return { bg, fg };
}

export function Avatar({ name, size = 34, online }: { name: string; size?: number; online?: boolean }) {
  const { bg, fg } = avatarColors(name);
  return (
    <span className="relative inline-block shrink-0">
      <span
        className="inline-flex items-center justify-center rounded-full font-semibold"
        style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.34 }}
      >
        {initials(name)}
      </span>
      {online && <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-paper bg-success" />}
    </span>
  );
}

export const STATUS_LABEL: Record<ConversationStatus, string> = {
  agent: "Assistente online",
  waiting_analyst: "Aguardando atendente",
  with_analyst: "Em atendimento",
  closed: "Encerrada",
};

const STATUS_TONE: Record<ConversationStatus, "success" | "warning" | "primary" | "neutral"> = {
  agent: "success",
  waiting_analyst: "warning",
  with_analyst: "primary",
  closed: "neutral",
};

/** Pill de status com ponto colorido (Top Bar / Header do console). */
export function StatusPill({ status, label }: { status: ConversationStatus; label?: string }) {
  return <DotPill tone={STATUS_TONE[status]}>{label ?? STATUS_LABEL[status]}</DotPill>;
}

const TONE: Record<string, { bg: string; dot: string; text: string }> = {
  success: { bg: "bg-success-soft", dot: "bg-success", text: "text-success-text" },
  warning: { bg: "bg-warning-soft", dot: "bg-warning", text: "text-warning-text" },
  primary: { bg: "bg-primary-soft", dot: "bg-primary", text: "text-primary-text" },
  danger: { bg: "bg-danger-soft", dot: "bg-danger", text: "text-danger-text" },
  neutral: { bg: "bg-desk", dot: "bg-ink-3", text: "text-ink-3" },
};

export function DotPill({ tone, children }: { tone: keyof typeof TONE; children: React.ReactNode }) {
  const t = TONE[tone]!;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[12.5px] font-semibold ${t.bg} ${t.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {children}
    </span>
  );
}

export const PRIORITY_DOT: Record<Priority, string> = {
  Crítica: "bg-danger",
  Alta: "bg-warning",
  Média: "bg-[#1B243166]",
  Baixa: "bg-rule",
};

/** Status de chamado como "ponto + texto", como no protótipo. */
export function TicketStatusDot({ status, strong }: { status: TicketStatus; strong?: boolean }) {
  const tone =
    status === "Aguardando analista"
      ? { dot: "bg-warning", text: "text-warning-text" }
      : status === "Resolvido" || status === "Aprovado"
        ? { dot: "bg-success", text: "text-success-text" }
        : status === "Fechado"
          ? { dot: "bg-ink-3", text: "text-ink-3" }
          : { dot: "bg-primary", text: "text-primary-text" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12.5px] ${strong ? `font-medium ${tone.text}` : "text-ink-3"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {status}
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

/** "10:05" hoje, "ontem", senão "16 out". */
export function shortWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

export const fmtTime = (iso: string): string => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export const fmtDate = (iso: string): string =>
  `${new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "")}, ${fmtTime(iso)}`;

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13.5px] text-ink-3">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-rule border-t-cta" />
      {label}
    </span>
  );
}

export function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Erro ${res.status}`);
  return data;
}
