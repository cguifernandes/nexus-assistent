import { RequestContext } from "@mastra/core/request-context";
import { mastra } from "./index";
import { MODEL } from "./agent";
import { TOOL_LABELS } from "./tools";
import { markAgentDown } from "./ready";
import * as conversations from "@/services/conversations";
import type { Block, Conversation, ConversationStatus, Decision, Employee, Message, TraceStep } from "@/lib/types";

export type AgentEvent =
  | { type: "step"; label: string }
  | { type: "text"; delta: string }
  | { type: "block"; block: Block }
  | { type: "done"; message: Message; status: ConversationStatus }
  | { type: "error"; message: string };

const TRANSFER_LABEL: Record<string, string> = {
  pedido_do_funcionario: "a pedido do funcionário",
  caso_critico: "caso crítico",
  chamado_vencido: "chamado vencido",
  sem_seguranca: "o agent não teve segurança para decidir",
  outro: "",
};

function dynamicSystem(conv: Conversation, employee: Employee): string {
  const pending = conv.drafts.filter((d) => !d.applied).at(-1);
  const lines = [
    `Funcionário logado: ${employee.name} (${employee.email}), área ${employee.department}.`,
    `Agora: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`,
  ];
  if (pending) lines.push(`Rascunho pendente de confirmação: ${pending.id} (${pending.mode}) — ${JSON.stringify(pending)}.`);
  return lines.join("\n");
}

/** Roda um turno do agent e emite eventos para o cliente. Persiste a resposta ao final. */
export async function runAgent(conv: Conversation, employee: Employee, emit: (e: AgentEvent) => void): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY não configurada no .env");
  try {
    await runTurn(conv, employee, emit);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/x-api-key|authentication|401/i.test(msg)) {
      markAgentDown("ANTHROPIC_API_KEY foi recusada pelo provedor (chave inválida).");
      throw new Error("a chave do provedor de IA foi recusada. Confira ANTHROPIC_API_KEY no .env.");
    }
    throw e;
  }
}

async function runTurn(conv: Conversation, employee: Employee, emit: (e: AgentEvent) => void): Promise<void> {

  const started = Date.now();
  // ponytail: histórico só de texto (últimas 24 msgs); cards/ferramentas não são reenviados.
  const history: ({ role: "user"; content: string } | { role: "assistant"; content: string })[] = [];
  for (const m of conv.messages.filter((m) => m.role !== "system").slice(-24)) {
    if (m.role === "user") history.push({ role: "user", content: m.content });
    else history.push({ role: "assistant", content: m.role === "analyst" ? `[Analista] ${m.content}` : m.content });
  }

  const requestContext = new RequestContext();
  requestContext.set("employeeId", employee.id);
  requestContext.set("employeeName", employee.name);
  requestContext.set("conversationId", conv.id);

  const agent = mastra.getAgent("nexoAssist");
  const stream = await agent.stream(history, {
    requestContext,
    maxSteps: 8,
    system: dynamicSystem(conv, employee),
    modelSettings: { maxOutputTokens: 1200 },
  });

  const steps: TraceStep[] = [];
  const blocks: Block[] = [];
  const startedAt = new Map<string, { at: number; args: unknown }>();
  let decision: Decision | undefined;
  let text = "";

  for await (const chunk of stream.fullStream) {
    switch (chunk.type) {
      case "text-delta":
        text += chunk.payload.text;
        emit({ type: "text", delta: chunk.payload.text });
        break;
      case "tool-call": {
        const { toolCallId, toolName, args } = chunk.payload;
        startedAt.set(toolCallId, { at: Date.now(), args });
        emit({ type: "step", label: TOOL_LABELS[toolName] ?? toolName });
        if (toolName === "recordDecision") decision = args as Decision;
        break;
      }
      case "tool-result":
      case "tool-error": {
        const { toolCallId, toolName } = chunk.payload;
        const start = startedAt.get(toolCallId);
        const raw = chunk.type === "tool-result" ? chunk.payload.result : { error: String(chunk.payload.error) };
        const { block, ...result } = (raw ?? {}) as { block?: Block } & Record<string, unknown>;
        if (block) {
          blocks.push(block);
          emit({ type: "block", block });
        }
        steps.push({
          tool: toolName,
          label: TOOL_LABELS[toolName] ?? toolName,
          args: start?.args ?? chunk.payload.args,
          result,
          ms: start ? Date.now() - start.at : 0,
        });
        break;
      }
      case "error":
        throw chunk.payload.error instanceof Error ? chunk.payload.error : new Error(String(chunk.payload.error));
    }
  }

  const usage = await stream.usage.catch(() => undefined);
  const message = conversations.addMessage(conv, {
    role: "assistant",
    content: text.trim() || "(sem resposta)",
    blocks,
    trace: {
      steps,
      decision,
      model: MODEL,
      usage: usage ? { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens } : undefined,
      durationMs: Date.now() - started,
    },
  });

  if (conv.status === "waiting_analyst") {
    const why = TRANSFER_LABEL[conv.transferReason ?? "outro"] ?? "";
    conversations.addMessage(conv, { role: "system", content: `Conversa transferida para um analista${why ? ` (${why})` : ""}.` });
  }
  emit({ type: "done", message, status: conv.status });
}
