/**
 * Serviço de chamados simulado. É a única porta de entrada para os chamados:
 * o agent e o console só falam com ele por estas funções. Toda função recebe o
 * employeeId e só devolve chamados daquele funcionário (regra de privacidade).
 *
 * Simula um sistema legado que fica indisponível de vez em quando.
 */
import { db, now, save } from "@/lib/db";
import {
  CLOSED_STATUSES,
  type Category,
  type Priority,
  type Ticket,
  type TicketType,
  type TicketView,
} from "@/lib/types";

export class TicketServiceUnavailable extends Error {
  constructor() {
    super("Sistema de chamados temporariamente indisponível");
    this.name = "TicketServiceUnavailable";
  }
}

const outageRate = (): number => Number(process.env.TICKET_OUTAGE_RATE ?? 0.15);

function maybeFail(): void {
  if (Math.random() < outageRate()) throw new TicketServiceUnavailable();
}

/** Prazo por prioridade, em horas úteis (Crítica é relógio corrido). */
export const SLA: Record<Priority, { hours: number; label: string; businessHours: boolean }> = {
  Crítica: { hours: 1, label: "1 hora", businessHours: false },
  Alta: { hours: 4, label: "4 horas úteis", businessHours: true },
  Média: { hours: 24, label: "3 dias úteis", businessHours: true },
  Baixa: { hours: 40, label: "5 dias úteis", businessHours: true },
};

/** Soma horas úteis (seg–sex, 8h–18h) a uma data. */
export function addBusinessHours(from: Date, hours: number): Date {
  const d = new Date(from);
  let left = hours;
  while (left > 0) {
    d.setHours(d.getHours() + 1);
    const day = d.getDay();
    const h = d.getHours();
    if (day >= 1 && day <= 5 && h > 8 && h <= 18) left -= 1;
  }
  return d;
}

export function toView(t: Ticket, at: Date = new Date()): TicketView {
  const open = !(CLOSED_STATUSES as readonly string[]).includes(t.status);
  const sla = SLA[t.priority];
  const base = new Date(t.updatedAt);
  const due = sla.businessHours ? addBusinessHours(base, sla.hours) : new Date(base.getTime() + sla.hours * 36e5);
  const resolvedAt = t.resolvedAt ? new Date(t.resolvedAt) : undefined;
  return {
    ...t,
    open,
    slaLabel: sla.label,
    dueAt: due.toISOString(),
    overdue: open && at > due,
    reopenable: !open && !!resolvedAt && at.getTime() - resolvedAt.getTime() <= 7 * 864e5,
  };
}

export function listByEmployee(employeeId: string): TicketView[] {
  maybeFail();
  return db()
    .tickets.filter((t) => t.requesterId === employeeId)
    .map((t) => toView(t))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getForEmployee(id: string, employeeId: string): TicketView | undefined {
  maybeFail();
  const t = db().tickets.find((t) => t.id.toUpperCase() === id.toUpperCase() && t.requesterId === employeeId);
  return t && toView(t);
}

const STOP = new Set(["para", "com", "que", "não", "nao", "meu", "minha", "está", "esta", "uma", "dos", "das", "por"]);
const tokens = (s: string): Set<string> =>
  new Set(
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );

export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const w of ta) if (tb.has(w)) inter++;
  return inter / Math.min(ta.size, tb.size);
}

/** Chamados abertos (ou resolvidos há até 7 dias) do funcionário parecidos com o texto. */
export function findSimilar(employeeId: string, text: string): { ticket: TicketView; score: number }[] {
  // ponytail: Jaccard-ish por palavras; trocar por embeddings se a base crescer.
  return listByEmployee(employeeId)
    .filter((t) => t.open || t.reopenable)
    .map((ticket) => ({ ticket, score: similarity(text, `${ticket.title} ${ticket.description}`) }))
    .filter((x) => x.score >= 0.34)
    .sort((a, b) => b.score - a.score);
}

export interface CreateInput {
  type: TicketType;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  affected: string;
  requesterId: string;
  requesterName: string;
}

export function create(input: CreateInput): TicketView {
  maybeFail();
  const d = db();
  d.counters[input.type] += 1;
  const at = now();
  const t: Ticket = {
    id: `${input.type}-${d.counters[input.type]}`,
    type: input.type,
    title: input.title,
    description: input.description,
    category: input.category,
    priority: input.priority,
    affected: input.affected,
    requesterId: input.requesterId,
    status: "Aberto",
    createdAt: at,
    updatedAt: at,
    history: [{ at, by: input.requesterName, text: "Chamado aberto pelo Nexo Assist." }],
  };
  d.tickets.push(t);
  save();
  return toView(t);
}

function mustOwn(id: string, employeeId: string): Ticket {
  maybeFail();
  const t = db().tickets.find((t) => t.id.toUpperCase() === id.toUpperCase());
  if (!t || t.requesterId !== employeeId) throw new Error(`Chamado ${id} não encontrado para este funcionário`);
  return t;
}

export function addComment(id: string, employeeId: string, by: string, text: string): TicketView {
  const t = mustOwn(id, employeeId);
  const at = now();
  t.history.push({ at, by, text });
  t.updatedAt = at;
  save();
  return toView(t);
}

export function reopen(id: string, employeeId: string, by: string, text: string): TicketView {
  const t = mustOwn(id, employeeId);
  const v = toView(t);
  if (v.open) throw new Error(`Chamado ${id} já está aberto`);
  if (!v.reopenable) throw new Error(`Chamado ${id} foi resolvido há mais de 7 dias e não pode ser reaberto`);
  const at = now();
  t.status = "Aberto";
  delete t.resolvedAt;
  t.history.push({ at, by, text: `Reaberto: ${text}` });
  t.updatedAt = at;
  save();
  return toView(t);
}

/** Marca o chamado como resolvido (ex.: analista encerrou o atendimento). */
export function resolve(id: string, employeeId: string, by: string, text: string): TicketView {
  const t = mustOwn(id, employeeId);
  if (!toView(t).open) return toView(t);
  const at = now();
  t.status = "Resolvido";
  t.resolvedAt = at;
  t.history.push({ at, by, text });
  t.updatedAt = at;
  save();
  return toView(t);
}

/** Transfere o chamado para a fila de analistas. */
export function escalate(id: string, employeeId: string, note: string): TicketView {
  const t = mustOwn(id, employeeId);
  const at = now();
  t.status = "Aguardando analista";
  t.history.push({ at, by: "Nexo Assist", text: `Transferido para analista: ${note}` });
  t.updatedAt = at;
  save();
  return toView(t);
}

/** Retry curto para a instabilidade do sistema legado. */
export async function withRetry<T>(fn: () => T, attempts = 3, delayMs = 400): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return fn();
    } catch (e) {
      if (!(e instanceof TicketServiceUnavailable) || i >= attempts) throw e;
      await new Promise((r) => setTimeout(r, delayMs * i));
    }
  }
}
