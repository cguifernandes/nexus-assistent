import type { DB } from "./db";
import type { Article, Conversation, Employee, Ticket } from "./types";

const daysAgo = (d: number, h = 0): string => new Date(Date.now() - d * 864e5 - h * 36e5).toISOString();

const employees: Employee[] = [
  { id: "e1", name: "Ana Souza", email: "ana.souza@nexo.com", department: "Financeiro", role: "employee" },
  { id: "e2", name: "Bruno Lima", email: "bruno.lima@nexo.com", department: "Vendas", role: "employee" },
  { id: "e3", name: "Carla Mendes", email: "carla.mendes@nexo.com", department: "Marketing", role: "employee" },
  { id: "a1", name: "Diego Rocha", email: "diego.rocha@nexo.com", department: "TI · Suporte N1", role: "analyst" },
  { id: "a2", name: "Elena Costa", email: "elena.costa@nexo.com", department: "TI · Suporte N2", role: "analyst" },
];

const articles: Article[] = [
  {
    id: "kb-1",
    title: "VPN com erro 809",
    body: "Reinstale o cliente de VPN pelo portal de softwares e reinicie o computador. Vale apenas para Windows 10; no Windows 11, abra um chamado.",
    tags: ["vpn", "erro 809", "rede", "windows"],
  },
  {
    id: "kb-2",
    title: "Horário do service desk",
    body: "O service desk atende de segunda a sexta, das 8h às 18h. Chamados críticos têm plantão 24 horas.",
    tags: ["horário", "atendimento", "plantão"],
  },
  {
    id: "kb-3",
    title: "Esqueci a senha da rede (Windows / e-mail)",
    body: "Acesse senha.nexo.com, informe seu e-mail corporativo e siga o código enviado por SMS para o celular cadastrado. A nova senha vale para Windows, e-mail e Wi-Fi. Se o celular cadastrado estiver desatualizado, abra um chamado de Acesso.",
    tags: ["senha", "reset", "windows", "e-mail", "acesso"],
  },
  {
    id: "kb-4",
    title: "Senha do SAP bloqueada",
    body: "O SAP bloqueia após 3 tentativas erradas. O desbloqueio é feito apenas pela equipe de Acesso: abra um chamado na categoria Acesso informando seu usuário SAP. Prazo típico: 4 horas úteis.",
    tags: ["sap", "senha", "bloqueio", "acesso"],
  },
  {
    id: "kb-5",
    title: "Outlook não sincroniza ou está lento",
    body: "Feche o Outlook, abra o Painel de Controle > Mail > Arquivos de dados e remova o arquivo .ost. Ao reabrir, o Outlook baixa a caixa de novo (pode levar alguns minutos). Se o erro persistir, abra um chamado de E-mail.",
    tags: ["outlook", "e-mail", "sincronizar", "lento"],
  },
  {
    id: "kb-6",
    title: "Como pedir um equipamento (monitor, teclado, notebook)",
    body: "Pedidos de equipamento são requisições (REQ) na categoria Hardware. Informe o modelo desejado e a justificativa. O pedido passa pela aprovação do seu gestor e, depois de aprovado, a entrega leva até 5 dias úteis no escritório ou 10 dias úteis para home office.",
    tags: ["equipamento", "monitor", "notebook", "teclado", "hardware", "requisição"],
  },
  {
    id: "kb-7",
    title: "Wi-Fi corporativo (NEXO-CORP) não conecta",
    body: "Esqueça a rede NEXO-CORP nas configurações do dispositivo e conecte de novo usando seu e-mail corporativo e a senha da rede. Visitantes devem usar a rede NEXO-GUEST com a senha disponível na recepção.",
    tags: ["wi-fi", "wifi", "rede", "conexão"],
  },
  {
    id: "kb-8",
    title: "Instalar software pelo portal",
    body: "Softwares homologados (Office, Chrome, Zoom, Power BI, cliente de VPN) podem ser instalados sem chamado pelo Portal de Softwares (ícone na área de trabalho). Softwares fora da lista exigem uma requisição (REQ) na categoria Software com justificativa.",
    tags: ["software", "instalar", "portal", "licença"],
  },
  {
    id: "kb-9",
    title: "Troquei de celular: como reconfigurar o MFA",
    body: "Com o celular antigo em mãos, acesse mfa.nexo.com e cadastre o novo aparelho. Sem o celular antigo, abra um chamado de Acesso: a equipe valida sua identidade com o gestor antes de resetar o MFA.",
    tags: ["mfa", "autenticação", "celular", "acesso"],
  },
];

const tickets: Ticket[] = [
  {
    id: "INC-20311",
    type: "INC",
    title: "Notebook lento após atualização do Windows",
    description: "Depois da atualização do Windows na semana passada o notebook demora mais de 10 minutos para ligar e trava ao abrir o Excel.",
    category: "Hardware",
    priority: "Média",
    status: "Aguardando analista",
    requesterId: "e1",
    affected: "Ana Souza",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(6),
    history: [
      { at: daysAgo(8), by: "Ana Souza", text: "Chamado aberto." },
      { at: daysAgo(6), by: "Diego Rocha", text: "Encaminhado para N2 para análise do disco." },
    ],
  },
  {
    id: "REQ-10442",
    type: "REQ",
    title: "Segundo monitor para home office",
    description: "Preciso de um segundo monitor de 24 polegadas para trabalhar de casa com as planilhas do fechamento.",
    category: "Hardware",
    priority: "Baixa",
    status: "Aprovado",
    requesterId: "e1",
    affected: "Ana Souza",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(7),
    history: [
      { at: daysAgo(9), by: "Ana Souza", text: "Requisição aberta." },
      { at: daysAgo(7), by: "Gestor", text: "Aprovado pelo gestor. Aguardando entrega." },
    ],
  },
  {
    id: "INC-20150",
    type: "INC",
    title: "Senha do SAP bloqueada",
    description: "Errei a senha três vezes e o SAP bloqueou meu usuário ASOUZA.",
    category: "Acesso",
    priority: "Média",
    status: "Resolvido",
    requesterId: "e1",
    affected: "Ana Souza",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(4),
    resolvedAt: daysAgo(4),
    history: [
      { at: daysAgo(5), by: "Ana Souza", text: "Chamado aberto." },
      { at: daysAgo(4), by: "Elena Costa", text: "Usuário desbloqueado e senha temporária enviada." },
    ],
  },
  {
    id: "INC-20390",
    type: "INC",
    title: "VPN não conecta (erro 809) no Windows 11",
    description: "Desde ontem a VPN dá erro 809 no meu notebook com Windows 11. Já reinstalei o cliente pelo portal.",
    category: "Rede e VPN",
    priority: "Alta",
    status: "Em andamento",
    requesterId: "e2",
    affected: "Bruno Lima",
    createdAt: daysAgo(0, 3),
    updatedAt: daysAgo(0, 2),
    history: [
      { at: daysAgo(0, 3), by: "Bruno Lima", text: "Chamado aberto." },
      { at: daysAgo(0, 2), by: "Diego Rocha", text: "Em análise: possível conflito com a atualização KB do Windows 11." },
    ],
  },
  {
    id: "REQ-10460",
    type: "REQ",
    title: "Licença do Power BI Pro",
    description: "Preciso da licença Pro para publicar os dashboards de vendas.",
    category: "Software",
    priority: "Baixa",
    status: "Resolvido",
    requesterId: "e2",
    affected: "Bruno Lima",
    createdAt: daysAgo(25),
    updatedAt: daysAgo(20),
    resolvedAt: daysAgo(20),
    history: [
      { at: daysAgo(25), by: "Bruno Lima", text: "Requisição aberta." },
      { at: daysAgo(20), by: "Elena Costa", text: "Licença atribuída." },
    ],
  },
  {
    id: "INC-20401",
    type: "INC",
    title: "Impressora do 3º andar sem toner",
    description: "A impressora HP do 3º andar está sem toner desde ontem.",
    category: "Hardware",
    priority: "Baixa",
    status: "Aberto",
    requesterId: "e3",
    affected: "Carla Mendes",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    history: [{ at: daysAgo(1), by: "Carla Mendes", text: "Chamado aberto." }],
  },
];

const conversations: Conversation[] = [
  {
    id: "c-seed-1",
    employeeId: "e1",
    status: "waiting_analyst",
    createdAt: daysAgo(0, 1),
    updatedAt: daysAgo(0, 1),
    summary:
      "Ana pergunta pelo INC-20311 (notebook lento), que está vencido há 6 dias aguardando analista. Pediu para falar com uma pessoa.",
    transferReason: "chamado_vencido",
    ticketId: "INC-20311",
    drafts: [],
    messages: [
      { id: "m1", role: "user", content: "Oi, meu chamado do notebook lento ainda não teve resposta. Alguém pode olhar?", at: daysAgo(0, 1) },
      {
        id: "m2",
        role: "assistant",
        content:
          "Encontrei o chamado INC-20311 (Notebook lento após atualização do Windows). Ele está aguardando analista há 6 dias e o prazo de 3 dias úteis já venceu. Vou transferir a conversa para um analista com o resumo do caso.",
        at: daysAgo(0, 1),
        trace: {
          steps: [
            { tool: "recordDecision", label: "classificou o pedido", args: { intent: "consulta_chamado", confidence: 0.9 }, result: { ok: true }, ms: 1 },
            { tool: "listMyTickets", label: "consultou seus chamados", args: {}, result: { count: 3 }, ms: 120 },
            { tool: "transferToAnalyst", label: "transferiu para um analista", args: { reason: "chamado_vencido" }, result: { ok: true }, ms: 5 },
          ],
          decision: {
            intent: "consulta_chamado",
            confidence: 0.9,
            reasoning:
              "A funcionária quer saber do chamado do notebook; o único chamado aberto compatível é o INC-20311, que está vencido. Regra: chamado vencido transfere para analista.",
            plannedAction: "Mostrar o status e transferir.",
          },
          model: "seed",
          durationMs: 1200,
        },
      },
      { id: "m3", role: "system", content: "Conversa transferida para um analista (chamado vencido).", at: daysAgo(0, 1) },
    ],
  },
];

export function seed(): DB {
  return { employees, articles, tickets, conversations, counters: { INC: 20401, REQ: 10460, conv: 1 } };
}
