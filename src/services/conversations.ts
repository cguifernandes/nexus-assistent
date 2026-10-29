import { db, now, save, uid } from "@/lib/db";
import type { Conversation, ConversationStatus, Draft, Message } from "@/lib/types";

export function get(id: string): Conversation | undefined {
  return db().conversations.find((c) => c.id === id);
}

export function getOwned(id: string, employeeId: string): Conversation | undefined {
  const c = get(id);
  return c && c.employeeId === employeeId ? c : undefined;
}

export function list(status?: ConversationStatus): Conversation[] {
  return db()
    .conversations.filter((c) => !status || c.status === status)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function listByEmployee(employeeId: string): Conversation[] {
  return list().filter((c) => c.employeeId === employeeId);
}

export function create(employeeId: string): Conversation {
  const d = db();
  d.counters.conv += 1;
  const at = now();
  const c: Conversation = {
    id: `c-${d.counters.conv}-${uid()}`,
    employeeId,
    status: "agent",
    messages: [],
    drafts: [],
    createdAt: at,
    updatedAt: at,
  };
  d.conversations.push(c);
  save();
  return c;
}

/** Conversa mais recente não encerrada do funcionário, ou uma nova. */
export function current(employeeId: string): Conversation {
  return listByEmployee(employeeId).find((c) => c.status !== "closed") ?? create(employeeId);
}

export function addMessage(c: Conversation, m: Omit<Message, "id" | "at">): Message {
  const msg: Message = { id: uid(), at: now(), ...m };
  c.messages.push(msg);
  c.updatedAt = msg.at;
  save();
  return msg;
}

export function setStatus(c: Conversation, status: ConversationStatus, extra: Partial<Conversation> = {}): void {
  Object.assign(c, extra, { status, updatedAt: now() });
  save();
}

export function addDraft(c: Conversation, d: Omit<Draft, "id">): Draft {
  const draft: Draft = { id: `D-${c.drafts.length + 1}`, ...d };
  c.drafts.push(draft);
  save();
  return draft;
}

export const userMessageCount = (c: Conversation): number => c.messages.filter((m) => m.role === "user").length;

export interface ConversationSummary {
  id: string;
  status: ConversationStatus;
  updatedAt: string;
  ticketId?: string;
  lastMessage: string;
  lastRole?: Message["role"];
  /** Mensagens de analista depois da última mensagem do funcionário. */
  unreadFromAnalyst: number;
}

/** Registra que o funcionário viu a conversa agora. */
export function markSeen(c: Conversation): void {
  c.employeeSeenAt = now();
  save();
}

export function summarize(c: Conversation): ConversationSummary {
  const seen = c.employeeSeenAt ?? "";
  const unread = c.messages.filter((m) => m.role === "analyst" && m.at > seen).length;
  const last = c.messages.at(-1);
  return {
    id: c.id,
    status: c.status,
    updatedAt: c.updatedAt,
    ticketId: c.ticketId,
    lastMessage: last?.content ?? "",
    lastRole: last?.role,
    unreadFromAnalyst: unread,
  };
}
