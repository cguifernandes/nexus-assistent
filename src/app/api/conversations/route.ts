import { isResponse, json, requireUser } from "@/lib/api";
import * as conversations from "@/services/conversations";
import { agentReady } from "@/mastra/ready";

/** GET: conversa atual do funcionário (cria se não houver). POST: começa uma nova. */
export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  return json({ conversation: conversations.current(user.id), agentReady });
}

export async function POST() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const open = conversations.current(user.id);
  if (open.messages.length === 0) return json({ conversation: open, agentReady });
  if (open.status === "agent") conversations.setStatus(open, "closed");
  return json({ conversation: conversations.create(user.id), agentReady });
}
