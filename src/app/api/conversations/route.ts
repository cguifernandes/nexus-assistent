import { isResponse, json, requireUser } from "@/lib/api";
import * as conversations from "@/services/conversations";
import { agentHealth } from "@/mastra/ready";

/** GET: conversa atual do funcionário (cria se não houver); com ?list=1, a lista resumida. POST: começa uma nova. */
export async function GET(req: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (new URL(req.url).searchParams.get("list")) {
    return json({ conversations: conversations.listByEmployee(user.id).map(conversations.summarize) });
  }
  const agent = await agentHealth();
  return json({ conversation: conversations.current(user.id), agent });
}

export async function POST() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const agent = await agentHealth();
  const open = conversations.current(user.id);
  if (open.messages.length === 0) return json({ conversation: open, agent });
  if (open.status === "agent") conversations.setStatus(open, "closed");
  return json({ conversation: conversations.create(user.id), agent });
}
