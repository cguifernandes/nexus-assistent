import type { DB } from "./db";
import { hashPassword } from "./password";
import type { Conversation, Employee, Ticket } from "./types";

const daysAgo = (d: number, h = 0): string => new Date(Date.now() - d * 864e5 - h * 36e5).toISOString();

const employees: Employee[] = [
  // Analista do service desk; também tem chamados de exemplo.
  { id: "assistente", name: "Assistente Nexo", email: "assistente@nexo.com", department: "TI · Service desk", role: "analyst", passwordHash: hashPassword("assistente123") },
  { id: "teste", name: "Usuário Teste", email: "teste@nexo.com", department: "Operações", role: "employee", passwordHash: hashPassword("teste123") },
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
    requesterId: "assistente",
    affected: "Assistente Nexo",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(6),
    history: [
      { at: daysAgo(8), by: "Assistente Nexo", text: "Chamado aberto." },
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
    requesterId: "assistente",
    affected: "Assistente Nexo",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(7),
    history: [
      { at: daysAgo(9), by: "Assistente Nexo", text: "Requisição aberta." },
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
    requesterId: "assistente",
    affected: "Assistente Nexo",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(4),
    resolvedAt: daysAgo(4),
    history: [
      { at: daysAgo(5), by: "Assistente Nexo", text: "Chamado aberto." },
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
    requesterId: "assistente",
    affected: "Assistente Nexo",
    createdAt: daysAgo(0, 3),
    updatedAt: daysAgo(0, 2),
    history: [
      { at: daysAgo(0, 3), by: "Assistente Nexo", text: "Chamado aberto." },
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
    requesterId: "assistente",
    affected: "Assistente Nexo",
    createdAt: daysAgo(25),
    updatedAt: daysAgo(20),
    resolvedAt: daysAgo(20),
    history: [
      { at: daysAgo(25), by: "Assistente Nexo", text: "Requisição aberta." },
      { at: daysAgo(20), by: "Elena Costa", text: "Licença atribuída." },
    ],
  },
];

const conversations: Conversation[] = [];

export function seed(): DB {
  return { employees, tickets, conversations, counters: { INC: 20390, REQ: 10460, conv: 0 } };
}
