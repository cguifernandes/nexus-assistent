export type Role = "employee" | "analyst";

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: Role;
}

export const TICKET_TYPES = ["INC", "REQ"] as const;
export type TicketType = (typeof TICKET_TYPES)[number];

export const CATEGORIES = ["Acesso", "Rede e VPN", "Hardware", "Software", "E-mail", "Outros"] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ["Crítica", "Alta", "Média", "Baixa"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const OPEN_STATUSES = ["Aberto", "Em andamento", "Aguardando analista", "Aprovado"] as const;
export const CLOSED_STATUSES = ["Resolvido", "Fechado"] as const;
export type TicketStatus = (typeof OPEN_STATUSES)[number] | (typeof CLOSED_STATUSES)[number];

export interface TicketEvent {
  at: string;
  by: string;
  text: string;
}

export interface Ticket {
  id: string;
  type: TicketType;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: TicketStatus;
  requesterId: string;
  affected: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  history: TicketEvent[];
}

/** Ticket + SLA computed fields, as exposed to the agent and the UI. */
export interface TicketView extends Ticket {
  open: boolean;
  slaLabel: string;
  dueAt: string;
  overdue: boolean;
  reopenable: boolean;
}

export interface Article {
  id: string;
  title: string;
  body: string;
  tags: string[];
}

export type ConversationStatus = "agent" | "waiting_analyst" | "with_analyst" | "closed";

export interface Draft {
  id: string;
  mode: "create" | "update" | "reopen";
  ticketId?: string;
  title: string;
  description: string;
  type: TicketType;
  category: Category;
  priority: Priority;
  affected: string;
  applied?: boolean;
}

export type Block =
  | { type: "tickets"; tickets: TicketView[]; selectable: boolean }
  | { type: "draft"; draft: Draft; slaLabel: string; possibleDuplicates: string[] }
  | { type: "options"; options: string[] }
  | { type: "articles"; articles: Pick<Article, "id" | "title">[] };

export interface TraceStep {
  tool: string;
  label: string;
  args: unknown;
  result: unknown;
  ms: number;
}

export interface Decision {
  intent: string;
  confidence: number;
  reasoning: string;
  plannedAction: string;
}

export interface Trace {
  steps: TraceStep[];
  decision?: Decision;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  durationMs: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "analyst" | "system";
  content: string;
  at: string;
  blocks?: Block[];
  trace?: Trace;
}

export interface Conversation {
  id: string;
  employeeId: string;
  status: ConversationStatus;
  messages: Message[];
  drafts: Draft[];
  summary?: string;
  transferReason?: string;
  /** Chamado principal desta conversa (criado, atualizado ou transferido aqui). */
  ticketId?: string;
  analystId?: string;
  createdAt: string;
  updatedAt: string;
}

export const MAX_USER_MESSAGES = 30;
