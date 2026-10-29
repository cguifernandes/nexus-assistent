import { isResponse, json, requireUser } from "@/lib/api";
import * as conversations from "@/services/conversations";
import { agentHealth } from "@/mastra/ready";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const agent = await agentHealth();
  const conv = conversations.getOwned((await params).id, user.id);
  return conv ? json({ conversation: conv, agent }) : json({ error: "Conversa não encontrada" }, 404);
}
