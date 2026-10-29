import { isResponse, json, requireUser } from "@/lib/api";
import { MAX_USER_MESSAGES } from "@/lib/types";
import * as conversations from "@/services/conversations";
import { runAgent, type AgentEvent } from "@/mastra/run";
import { checkAgentRate } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
/** Um turno do agent leva ~5–15 s; na Vercel o padrão de 10 s cortaria o stream. */
export const maxDuration = 60;

/**
 * Envia uma mensagem do funcionário. Se a conversa está com o agent, responde em SSE
 * (eventos step/text/block/done). Se está com um analista, só registra a mensagem.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const conv = conversations.getOwned((await params).id, user.id);
  if (!conv) return json({ error: "Conversa não encontrada" }, 404);

  const { content } = (await req.json().catch(() => ({}))) as { content?: string };
  const text = content?.trim();
  if (!text) return json({ error: "Mensagem vazia" }, 400);
  if (text.length > 2000) return json({ error: "Mensagem longa demais (máx. 2000 caracteres)" }, 400);
  if (conv.status === "closed") return json({ error: "Esta conversa foi encerrada. Comece uma nova." }, 409);
  if (conversations.userMessageCount(conv) >= MAX_USER_MESSAGES) {
    conversations.addMessage(conv, { role: "system", content: `Limite de ${MAX_USER_MESSAGES} mensagens atingido. Comece uma nova conversa.` });
    conversations.setStatus(conv, "closed");
    return json({ error: `Limite de ${MAX_USER_MESSAGES} mensagens por conversa atingido.`, conversation: conv }, 409);
  }

  if (conv.status === "agent") {
    const limited = checkAgentRate(user.id);
    if (limited) return json({ error: limited, conversation: conv }, 429);
  }
  const message = conversations.addMessage(conv, { role: "user", content: text });
  if (conv.status !== "agent") return json({ message, status: conv.status, conversation: conv });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: AgentEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      try {
        await runAgent(conv, user, emit);
      } catch (e) {
        console.error("[agent]", e);
        const msg = e instanceof Error ? e.message : "Erro inesperado";
        conversations.addMessage(conv, { role: "system", content: `O agent não conseguiu responder: ${msg}` });
        emit({ type: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
