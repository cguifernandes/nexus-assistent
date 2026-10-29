import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { CATEGORIES, PRIORITIES, TICKET_TYPES, type Block, type TicketView } from "@/lib/types";
import * as tickets from "@/services/tickets";
import * as helpcenter from "@/services/helpcenter";
import * as conversations from "@/services/conversations";

/** Rótulos mostrados acima da resposta ("consultou seus chamados"). */
export const TOOL_LABELS: Record<string, string> = {
  recordDecision: "classificou o pedido",
  searchHelpCenter: "buscou na central de ajuda",
  listMyTickets: "consultou seus chamados",
  showTickets: "mostrou chamados",
  findSimilarTickets: "verificou duplicidade",
  proposeDraft: "montou um rascunho",
  applyDraft: "registrou o chamado",
  offerOptions: "ofereceu opções",
  transferToAnalyst: "transferiu para um analista",
};

/** Contexto injetado pelo runner em cada chamada (quem está falando, em qual conversa). */
export interface ToolCtx {
  employeeId: string;
  employeeName: string;
  conversationId: string;
}

// O 2º argumento do execute traz requestContext; aqui só precisamos do get().
type ExecCtx = { requestContext?: { get: (k: string) => unknown } } | undefined;

function who(ctx: ExecCtx): ToolCtx {
  const get = (k: string): string => {
    const v = ctx?.requestContext?.get(k);
    if (typeof v !== "string") throw new Error(`requestContext sem ${k}`);
    return v;
  };
  return { employeeId: get("employeeId"), employeeName: get("employeeName"), conversationId: get("conversationId") };
}

const UNAVAILABLE = {
  error: "O sistema de chamados está temporariamente indisponível. Avise o funcionário e peça para tentar de novo em alguns instantes.",
};

/** Resumo compacto do chamado para o modelo (menos tokens que a view inteira). */
const brief = (t: TicketView) => ({
  id: t.id,
  title: t.title,
  type: t.type,
  category: t.category,
  priority: t.priority,
  status: t.status,
  open: t.open,
  overdue: t.overdue,
  slaLabel: t.slaLabel,
  dueAt: t.dueAt,
  updatedAt: t.updatedAt,
  reopenable: t.reopenable,
  lastEvent: t.history.at(-1)?.text,
});

async function safe<T>(fn: () => T): Promise<T | typeof UNAVAILABLE> {
  try {
    return await tickets.withRetry(fn);
  } catch (e) {
    if (e instanceof tickets.TicketServiceUnavailable) return UNAVAILABLE;
    return { error: e instanceof Error ? e.message : String(e) } as typeof UNAVAILABLE;
  }
}

export const recordDecision = createTool({
  id: "recordDecision",
  description:
    "OBRIGATÓRIO: chame primeiro, em toda resposta, para registrar o que você entendeu, com que segurança e o que pretende fazer.",
  inputSchema: z.object({
    intent: z.enum([
      "duvida",
      "consulta_chamado",
      "atualizar_chamado",
      "abrir_chamado",
      "confirmacao",
      "falar_com_analista",
      "fora_de_escopo",
      "saudacao",
      "outro",
    ]),
    confidence: z.number().min(0).max(1).describe("Segurança na interpretação, de 0 a 1"),
    reasoning: z.string().describe("Por que entendeu assim, em 1 ou 2 frases"),
    plannedAction: z.string().describe("O que vai fazer nesta resposta"),
  }),
  execute: async ({ confidence }) => ({
    ok: true,
    hint:
      confidence < 0.4
        ? "Segurança baixa: pergunte ao funcionário o que ele quer ou transfira para um analista (reason sem_seguranca)."
        : undefined,
  }),
});

export const searchHelpCenter = createTool({
  id: "searchHelpCenter",
  description: "Busca artigos na central de ajuda de TI por palavras-chave. Use antes de responder dúvidas.",
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    const found = helpcenter.search(query);
    const block: Block | undefined = found.length
      ? { type: "articles", articles: found.map((a) => ({ id: a.id, title: a.title })) }
      : undefined;
    return { articles: found.map((a) => ({ id: a.id, title: a.title, body: a.body })), block };
  },
});

export const listMyTickets = createTool({
  id: "listMyTickets",
  description: "Lista os chamados do funcionário logado (abertos e recentes), com prazo e se está vencido.",
  inputSchema: z.object({}),
  execute: async (_input, ctx) => {
    const { employeeId } = who(ctx as ExecCtx);
    const r = await safe(() => tickets.listByEmployee(employeeId));
    return "error" in r ? r : { tickets: r.map(brief) };
  },
});

export const showTickets = createTool({
  id: "showTickets",
  description:
    "Mostra cards de chamados na conversa. Use selectable=true quando o funcionário precisa escolher entre vários.",
  inputSchema: z.object({ ticketIds: z.array(z.string()).min(1), selectable: z.boolean().default(false) }),
  execute: async ({ ticketIds, selectable }, ctx) => {
    const { employeeId } = who(ctx as ExecCtx);
    const r = await safe(() => tickets.listByEmployee(employeeId));
    if ("error" in r) return r;
    const ids = new Set(ticketIds.map((i) => i.toUpperCase()));
    const shown = r.filter((t) => ids.has(t.id));
    const block: Block = { type: "tickets", tickets: shown, selectable };
    return { shown: shown.map((t) => t.id), block };
  },
});

export const findSimilarTickets = createTool({
  id: "findSimilarTickets",
  description:
    "Procura chamados abertos (ou resolvidos há até 7 dias) do funcionário sobre o mesmo assunto. Use SEMPRE antes de propor um rascunho de abertura.",
  inputSchema: z.object({ text: z.string().describe("Título + descrição do problema") }),
  execute: async ({ text }, ctx) => {
    const { employeeId } = who(ctx as ExecCtx);
    const r = await safe(() => tickets.findSimilar(employeeId, text));
    return "error" in r ? r : { matches: r.map((m) => ({ ...brief(m.ticket), score: Number(m.score.toFixed(2)) })) };
  },
});

export const proposeDraft = createTool({
  id: "proposeDraft",
  description:
    "Monta um rascunho de abertura (create), complemento (update) ou reabertura (reopen) de chamado para o funcionário conferir. NÃO cria nada. Para update/reopen informe ticketId e use description para a nova informação.",
  inputSchema: z.object({
    mode: z.enum(["create", "update", "reopen"]),
    ticketId: z.string().optional(),
    title: z.string(),
    description: z.string(),
    type: z.enum(TICKET_TYPES),
    category: z.enum(CATEGORIES),
    priority: z.enum(PRIORITIES),
    affected: z.string().describe("Quem é afetado: a pessoa, a equipe ou a empresa"),
  }),
  execute: async (input, ctx) => {
    const { employeeId, conversationId } = who(ctx as ExecCtx);
    const conv = conversations.getOwned(conversationId, employeeId);
    if (!conv) return { error: "Conversa não encontrada" };
    if (input.mode !== "create") {
      if (!input.ticketId) return { error: "ticketId é obrigatório para update/reopen" };
      const t = await safe(() => tickets.getForEmployee(input.ticketId!, employeeId));
      if (!t) return { error: `Chamado ${input.ticketId} não pertence ao funcionário` };
      if ("error" in t) return t;
      if (input.mode === "reopen" && !t.reopenable) return { error: `Chamado ${t.id} não pode ser reaberto (não está resolvido ou passou de 7 dias)` };
      if (input.mode === "update" && !t.open) return { error: `Chamado ${t.id} não está aberto; use reopen se estiver resolvido há até 7 dias` };
    }
    const dupes =
      input.mode === "create"
        ? await safe(() => tickets.findSimilar(employeeId, `${input.title} ${input.description}`).map((m) => m.ticket.id))
        : [];
    const possibleDuplicates = "error" in dupes ? [] : dupes;
    const draft = conversations.addDraft(conv, { ...input, ticketId: input.ticketId?.toUpperCase() });
    const slaLabel = tickets.SLA[input.priority].label;
    const block: Block = { type: "draft", draft, slaLabel, possibleDuplicates };
    return {
      draftId: draft.id,
      slaLabel,
      possibleDuplicates,
      note: "Rascunho exibido ao funcionário. Peça a confirmação e só chame applyDraft depois que ele confirmar.",
      block,
    };
  },
});

const CONFIRM = /\b(confirm|sim|pode|ok|isso|certo|correto|vai|abre|abra|manda|envia|concordo|beleza|fechado|perfeito)/i;

export const applyDraft = createTool({
  id: "applyDraft",
  description: "Cria/atualiza/reabre o chamado de um rascunho já confirmado pelo funcionário.",
  inputSchema: z.object({ draftId: z.string() }),
  execute: async ({ draftId }, ctx) => {
    const { employeeId, employeeName, conversationId } = who(ctx as ExecCtx);
    const conv = conversations.getOwned(conversationId, employeeId);
    const draft = conv?.drafts.find((d) => d.id === draftId);
    if (!conv || !draft) return { error: `Rascunho ${draftId} não encontrado` };
    if (draft.applied) return { error: `Rascunho ${draftId} já foi aplicado` };
    const lastUser = [...conv.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    if (!CONFIRM.test(lastUser)) return { error: "O funcionário ainda não confirmou o rascunho. Peça a confirmação antes." };

    const r = await safe(() => {
      if (draft.mode === "create") {
        return tickets.create({ ...draft, requesterId: employeeId, requesterName: employeeName });
      }
      const text = draft.description;
      return draft.mode === "update"
        ? tickets.addComment(draft.ticketId!, employeeId, employeeName, text)
        : tickets.reopen(draft.ticketId!, employeeId, employeeName, text);
    });
    if ("error" in r) return r;
    draft.applied = true;
    const block: Block = { type: "tickets", tickets: [r], selectable: false };
    return { ticket: brief(r), block };
  },
});

export const offerOptions = createTool({
  id: "offerOptions",
  description:
    "Mostra botões de resposta rápida para uma pergunta fechada (ex.: 'Só você ou a equipe toda?'). Faça a pergunta no texto da resposta.",
  inputSchema: z.object({ options: z.array(z.string()).min(2).max(5) }),
  execute: async ({ options }) => ({ ok: true, block: { type: "options", options } satisfies Block }),
});

export const transferToAnalyst = createTool({
  id: "transferToAnalyst",
  description:
    "Transfere a conversa para um analista humano com um resumo. Use quando o funcionário pedir, em casos críticos, em chamados vencidos ou quando não tiver segurança. Depois disso, despeça-se em uma frase: você não responde mais até ser liberado.",
  inputSchema: z.object({
    reason: z.enum(["pedido_do_funcionario", "caso_critico", "chamado_vencido", "sem_seguranca", "outro"]),
    summary: z.string().describe("Resumo do caso para o analista: quem, o que, o que já foi feito"),
    ticketId: z.string().optional().describe("Chamado relacionado, se houver; ele também vai para a fila do analista"),
  }),
  execute: async ({ reason, summary, ticketId }, ctx) => {
    const { employeeId, conversationId } = who(ctx as ExecCtx);
    const conv = conversations.getOwned(conversationId, employeeId);
    if (!conv) return { error: "Conversa não encontrada" };
    conversations.setStatus(conv, "waiting_analyst", { summary, transferReason: reason });
    if (ticketId) await safe(() => tickets.escalate(ticketId, employeeId, summary));
    return { ok: true, note: "Conversa na fila de analistas. Encerre sua resposta em uma frase." };
  },
});

export const tools = {
  recordDecision,
  searchHelpCenter,
  listMyTickets,
  showTickets,
  findSimilarTickets,
  proposeDraft,
  applyDraft,
  offerOptions,
  transferToAnalyst,
};
