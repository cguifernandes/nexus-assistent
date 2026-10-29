import { db } from "@/lib/db";
import { isResponse, json, requireUser } from "@/lib/api";
import * as conversations from "@/services/conversations";
import * as tickets from "@/services/tickets";

async function load(id: string) {
  const conv = conversations.get(id);
  if (!conv) return undefined;
  const employee = db().employees.find((e) => e.id === conv.employeeId);
  let employeeTickets = null;
  let ticketsError: string | undefined;
  try {
    employeeTickets = await tickets.withRetry(() => tickets.listByEmployee(conv.employeeId));
  } catch (e) {
    ticketsError = e instanceof Error ? e.message : "Erro ao consultar chamados";
  }
  return { conversation: conv, employee, tickets: employeeTickets, ticketsError };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("analyst");
  if (isResponse(user)) return user;
  const data = await load((await params).id);
  return data ? json(data) : json({ error: "Conversa não encontrada" }, 404);
}

type Action = "takeover" | "return" | "close" | "message";

/** Ações do analista: assumir, devolver ao agent, encerrar, responder. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("analyst");
  if (isResponse(user)) return user;
  const conv = conversations.get((await params).id);
  if (!conv) return json({ error: "Conversa não encontrada" }, 404);
  const { action, content } = (await req.json().catch(() => ({}))) as { action?: Action; content?: string };

  switch (action) {
    case "takeover":
      if (conv.status === "closed") return json({ error: "Conversa encerrada" }, 409);
      conversations.setStatus(conv, "with_analyst", { analystId: user.id });
      conversations.addMessage(conv, { role: "system", content: `${user.name} assumiu o atendimento. O Nexo Assist está pausado.` });
      break;
    case "return":
      if (conv.status !== "with_analyst") return json({ error: "A conversa não está com você" }, 409);
      conversations.setStatus(conv, "agent", { analystId: undefined });
      conversations.addMessage(conv, { role: "system", content: "Conversa devolvida ao Nexo Assist." });
      break;
    case "close":
      conversations.setStatus(conv, "closed");
      conversations.addMessage(conv, { role: "system", content: `Conversa encerrada por ${user.name}.` });
      break;
    case "message": {
      if (conv.status !== "with_analyst" || conv.analystId !== user.id) return json({ error: "Assuma a conversa antes de responder" }, 409);
      const text = content?.trim();
      if (!text) return json({ error: "Mensagem vazia" }, 400);
      conversations.addMessage(conv, { role: "analyst", content: text });
      break;
    }
    default:
      return json({ error: "Ação inválida" }, 400);
  }
  return json(await load(conv.id));
}
