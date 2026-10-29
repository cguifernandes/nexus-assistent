import type { DB } from "./db";
import { hashPassword } from "./password";
import type { Article, Conversation, Employee, Ticket } from "./types";

const daysAgo = (d: number, h = 0): string => new Date(Date.now() - d * 864e5 - h * 36e5).toISOString();

const employees: Employee[] = [
  // Senha do admin: ADMIN_PASSWORD no .env (ver lib/auth.ts). Também é analista do service desk.
  { id: "admin", name: "Admin Nexo", email: "admin@nexo.com", department: "TI · Service desk", role: "analyst" },
  { id: "teste", name: "Usuário Teste", email: "teste@nexo.com", department: "Operações", role: "employee", passwordHash: hashPassword("teste123") },
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
    requesterId: "admin",
    affected: "Admin Nexo",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(6),
    history: [
      { at: daysAgo(8), by: "Admin Nexo", text: "Chamado aberto." },
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
    requesterId: "admin",
    affected: "Admin Nexo",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(7),
    history: [
      { at: daysAgo(9), by: "Admin Nexo", text: "Requisição aberta." },
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
    requesterId: "admin",
    affected: "Admin Nexo",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(4),
    resolvedAt: daysAgo(4),
    history: [
      { at: daysAgo(5), by: "Admin Nexo", text: "Chamado aberto." },
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
    requesterId: "admin",
    affected: "Admin Nexo",
    createdAt: daysAgo(0, 3),
    updatedAt: daysAgo(0, 2),
    history: [
      { at: daysAgo(0, 3), by: "Admin Nexo", text: "Chamado aberto." },
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
    requesterId: "admin",
    affected: "Admin Nexo",
    createdAt: daysAgo(25),
    updatedAt: daysAgo(20),
    resolvedAt: daysAgo(20),
    history: [
      { at: daysAgo(25), by: "Admin Nexo", text: "Requisição aberta." },
      { at: daysAgo(20), by: "Elena Costa", text: "Licença atribuída." },
    ],
  },
];

const conversations: Conversation[] = [];

export function seed(): DB {
  return { employees, articles, tickets, conversations, counters: { INC: 20390, REQ: 10460, conv: 0 } };
}
