import { db } from "@/lib/db";
import { isResponse, json, requireUser } from "@/lib/api";
import type { ConversationStatus } from "@/lib/types";
import * as conversations from "@/services/conversations";
import * as tickets from "@/services/tickets";

const STATUSES: ConversationStatus[] = ["agent", "waiting_analyst", "with_analyst", "closed"];

/** Lista de conversas para o console do analista, com nome do funcionário e última mensagem. */
export async function GET(req: Request) {
  const user = await requireUser("analyst");
  if (isResponse(user)) return user;
  const q = new URL(req.url).searchParams.get("status") as ConversationStatus | null;
  const status = q && STATUSES.includes(q) ? q : undefined;
  const employees = new Map(db().employees.map((e) => [e.id, e]));
  const items = conversations.list(status).map((c) => ({
    id: c.id,
    status: c.status,
    updatedAt: c.updatedAt,
    employee: employees.get(c.employeeId)?.name ?? c.employeeId,
    department: employees.get(c.employeeId)?.department ?? "",
    transferReason: c.transferReason,
    analystId: c.analystId,
    hadAnalyst: c.messages.some((m) => m.role === "analyst") || !!c.analystId || !!c.transferReason,
    summary: c.summary,
    ticketId: c.ticketId,
    ticketOpen: c.ticketId ? tickets.getForEmployee(c.ticketId, c.employeeId)?.open : undefined,
    lastConfidence: [...c.messages].reverse().find((m) => m.trace?.decision)?.trace?.decision?.confidence,
    lastMessage: c.messages.at(-1)?.content ?? "",
    lastRole: c.messages.at(-1)?.role,
    messages: c.messages.length,
  }));
  return json({ conversations: items });
}
