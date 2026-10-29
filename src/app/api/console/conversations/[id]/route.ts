import { db } from "@/lib/db";
import { isResponse, json, requireUser } from "@/lib/api";
import { publicEmployee } from "@/lib/auth";
import * as conversations from "@/services/conversations";
import * as tickets from "@/services/tickets";

async function load(id: string) {
  const conv = conversations.get(id);
  if (!conv) return undefined;
  const employee = db().employees.find((e) => e.id === conv.employeeId);
  const analyst = conv.analystId ? db().employees.find((e) => e.id === conv.analystId) : undefined;
  let employeeTickets = null;
  let ticketsError: string | undefined;
  try {
    employeeTickets = await tickets.withRetry(() => tickets.listByEmployee(conv.employeeId));
  } catch (e) {
    ticketsError = e instanceof Error ? e.message : "Erro ao consultar chamados";
  }
  return { conversation: conv, employee: employee && publicEmployee(employee), analyst: analyst && publicEmployee(analyst), tickets: employeeTickets, ticketsError };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("analyst");
  if (isResponse(user)) return user;
  const data = await load((await params).id);
  return data ? json(data) : json({ error: "Conversa não encontrada" }, 404);
}

type Action = "takeover" | "return" | "close" | "message" | "resolveTicket";

/** Ações do analista: assumir, devolver ao agent, encerrar, responder. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("analyst");
  if (isResponse(user)) return user;
  const conv = conversations.get((await params).id);
  if (!conv) return json({ error: "Conversa não encontrada" }, 404);
  const { action, content, ticketId } = (await req.json().catch(() => ({}))) as { action?: Action; content?: string; ticketId?: string };

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
      // Encerrar o atendimento resolve o chamado da conversa (se o sistema legado responder).
      if (conv.ticketId) {
        await tickets.withRetry(() => tickets.resolve(conv.ticketId!, conv.employeeId, user.name, `Resolvido no atendimento com ${user.name}.`)).catch(() => undefined);
      }
      break;
    case "message": {
      if (conv.status !== "with_analyst" || conv.analystId !== user.id) return json({ error: "Assuma a conversa antes de responder" }, 409);
      const text = content?.trim();
      if (!text) return json({ error: "Mensagem vazia" }, 400);
      conversations.addMessage(conv, { role: "analyst", content: text });
      break;
    }
    case "resolveTicket": {
      // Resolve um chamado do funcionário desta conversa, independentemente do status da conversa,
      // e avisa na conversa de origem do chamado.
      if (!ticketId) return json({ error: "Informe o chamado" }, 400);
      try {
        const t = await tickets.withRetry(() => tickets.resolve(ticketId, conv.employeeId, user.name, `Resolvido por ${user.name} pelo console.`));
        const origin = conversations.list().find((c) => c.employeeId === conv.employeeId && c.ticketId === t.id) ?? conv;
        conversations.addMessage(origin, { role: "system", content: `Chamado ${t.id} (${t.title}) foi resolvido por ${user.name}.` });
      } catch (e) {
        return json({ error: e instanceof Error ? e.message : "Não foi possível resolver o chamado" }, 503);
      }
      break;
    }
    default:
      return json({ error: "Ação inválida" }, 400);
  }
  return json(await load(conv.id));
}
