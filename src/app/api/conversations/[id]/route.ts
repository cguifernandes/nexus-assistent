import { isResponse, json, requireUser } from "@/lib/api";
import * as conversations from "@/services/conversations";
import { agentHealth } from "@/mastra/ready";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const agent = await agentHealth();
  const conv = conversations.getOwned((await params).id, user.id);
  if (!conv) return json({ error: "Conversa não encontrada" }, 404);
  conversations.markSeen(conv);
  return json({ conversation: conv, agent });
}
