import type { Article } from "./types";

/**
 * Central de ajuda. Conteúdo estático (não é dado do usuário), por isso não vai para o db.json.
 * As tags incluem sinônimos e jeitos comuns de falar, porque a busca é por palavras.
 */
export const ARTICLES: Article[] = [
  {
    id: "kb-1",
    title: "VPN com erro 809",
    body: "Reinstale o cliente de VPN pelo portal de softwares e reinicie o computador. Vale apenas para Windows 10; no Windows 11, abra um chamado.",
    tags: ["vpn", "erro 809", "809", "rede", "windows", "não conecta", "conexão remota", "home office"],
  },
  {
    id: "kb-2",
    title: "Horário do service desk",
    body: "O service desk atende de segunda a sexta, das 8h às 18h. Chamados críticos têm plantão 24 horas.",
    tags: ["horário", "atendimento", "plantão", "que horas", "funciona", "fim de semana", "feriado"],
  },
  {
    id: "kb-3",
    title: "Esqueci a senha da rede (Windows / e-mail)",
    body: "Acesse senha.nexo.com, informe seu e-mail corporativo e siga o código enviado por SMS para o celular cadastrado. A nova senha vale para Windows, e-mail e Wi-Fi. Se o celular cadastrado estiver desatualizado, abra um chamado de Acesso.",
    tags: ["senha", "reset", "redefinir", "trocar senha", "esqueci", "windows", "e-mail", "acesso", "login", "expirou"],
  },
  {
    id: "kb-4",
    title: "Senha do SAP bloqueada",
    body: "O SAP bloqueia após 3 tentativas erradas. O desbloqueio é feito apenas pela equipe de Acesso: abra um chamado na categoria Acesso informando seu usuário SAP. Prazo típico: 4 horas úteis.",
    tags: ["sap", "senha", "bloqueio", "bloqueado", "bloqueada", "desbloquear", "acesso", "usuário"],
  },
  {
    id: "kb-5",
    title: "Outlook não sincroniza ou está lento",
    body: "Feche o Outlook, abra o Painel de Controle > Mail > Arquivos de dados e remova o arquivo .ost. Ao reabrir, o Outlook baixa a caixa de novo (pode levar alguns minutos). Se o erro persistir, abra um chamado de E-mail.",
    tags: ["outlook", "e-mail", "email", "sincronizar", "lento", "não recebe", "não envia", "travando", "caixa de entrada"],
  },
  {
    id: "kb-6",
    title: "Como pedir um equipamento (monitor, teclado, notebook)",
    body: "Pedidos de equipamento são requisições (REQ) na categoria Hardware. Informe o modelo desejado e a justificativa. O pedido passa pela aprovação do seu gestor e, depois de aprovado, a entrega leva até 5 dias úteis no escritório ou 10 dias úteis para home office.",
    tags: ["equipamento", "monitor", "notebook", "teclado", "mouse", "headset", "fone", "cadeira", "hardware", "requisição", "pedir", "novo"],
  },
  {
    id: "kb-7",
    title: "Wi-Fi corporativo (NEXO-CORP) não conecta",
    body: "Esqueça a rede NEXO-CORP nas configurações do dispositivo e conecte de novo usando seu e-mail corporativo e a senha da rede. Visitantes devem usar a rede NEXO-GUEST com a senha disponível na recepção.",
    tags: ["wi-fi", "wifi", "rede", "conexão", "sem internet", "internet", "visitante", "guest", "sem fio"],
  },
  {
    id: "kb-8",
    title: "Instalar software pelo portal",
    body: "Softwares homologados (Office, Chrome, Zoom, Power BI, cliente de VPN) podem ser instalados sem chamado pelo Portal de Softwares (ícone na área de trabalho). Softwares fora da lista exigem uma requisição (REQ) na categoria Software com justificativa.",
    tags: ["software", "instalar", "instalação", "programa", "aplicativo", "portal", "licença", "office", "chrome", "zoom", "power bi"],
  },
  {
    id: "kb-9",
    title: "Troquei de celular: como reconfigurar o MFA",
    body: "Com o celular antigo em mãos, acesse mfa.nexo.com e cadastre o novo aparelho. Sem o celular antigo, abra um chamado de Acesso: a equipe valida sua identidade com o gestor antes de resetar o MFA.",
    tags: ["mfa", "autenticação", "dois fatores", "2fa", "celular", "token", "authenticator", "acesso", "código"],
  },
  {
    id: "kb-10",
    title: "Computador esquentando muito ou tela azul",
    body: "Se o computador estiver muito quente, desligue, deixe esfriar por 15 minutos e não use sobre cama, sofá ou tecido, que bloqueiam a ventilação. Tela azul (BSOD) uma vez só: reinicie e anote o código que aparece (ex.: CRITICAL_PROCESS_DIED). Se repetir, se houver cheiro de queimado ou se o equipamento não ligar, não insista: abra um chamado de Hardware com prioridade conforme o impacto no seu trabalho.",
    tags: ["tela azul", "bsod", "quente", "esquentando", "superaquecimento", "ventoinha", "cooler", "travou", "reiniciou sozinho", "desligou", "hardware", "cheiro de queimado"],
  },
  {
    id: "kb-11",
    title: "Notebook ou computador lento",
    body: "Reinicie o computador (desligar e ligar, não só fechar a tampa), feche abas e programas que não está usando e confira se há atualização do Windows pendente. Se a lentidão começou depois de uma atualização ou dura mais de um dia, abra um chamado de Hardware descrevendo desde quando e o que está lento.",
    tags: ["lento", "lentidão", "devagar", "travando", "demora", "desempenho", "notebook", "computador", "pc", "atualização"],
  },
  {
    id: "kb-12",
    title: "Impressora não imprime ou sem toner",
    body: "Confira se a impressora está selecionada como padrão e se tem papel. Toner e papel são repostos por Facilities (facilities@nexo.com), não pelo service desk. Se a impressora não aparece no computador ou dá erro de driver, abra um chamado de Hardware informando o andar e o nome da impressora.",
    tags: ["impressora", "imprimir", "impressão", "toner", "papel", "scanner", "digitalizar", "driver"],
  },
  {
    id: "kb-13",
    title: "Acesso a pasta de rede ou SharePoint",
    body: "Acessos a pastas e sites do SharePoint são concedidos pelo dono da área. Abra uma requisição (REQ) na categoria Acesso informando o caminho da pasta ou o link do site e o motivo. O pedido vai para aprovação do responsável; prazo típico de 3 dias úteis.",
    tags: ["pasta", "pasta de rede", "sharepoint", "acesso", "permissão", "compartilhamento", "onedrive", "liberar", "negado"],
  },
  {
    id: "kb-14",
    title: "Microsoft Teams: sem áudio, sem câmera ou não abre",
    body: "Saia do Teams (clique com o botão direito no ícone perto do relógio > Sair) e abra de novo. Para áudio e câmera, confira em Configurações > Dispositivos se o aparelho certo está selecionado, e se o Windows permite acesso ao microfone e à câmera. Se continuar, abra um chamado de Software.",
    tags: ["teams", "reunião", "áudio", "microfone", "câmera", "camera", "webcam", "som", "chamada", "videoconferência"],
  },
  {
    id: "kb-15",
    title: "Suspeita de phishing ou e-mail estranho",
    body: "Não clique em links nem abra anexos. Use o botão Reportar phishing no Outlook ou encaminhe para seguranca@nexo.com. Se já clicou ou digitou sua senha, troque a senha imediatamente em senha.nexo.com e abra um chamado crítico informando o que aconteceu.",
    tags: ["phishing", "golpe", "e-mail suspeito", "spam", "vírus", "malware", "segurança", "cliquei", "link estranho", "invasão"],
  },
  {
    id: "kb-16",
    title: "Notebook perdido, roubado ou danificado",
    body: "Em caso de perda ou roubo, avise imediatamente pelo chamado crítico (plantão 24 h) para bloquearmos o acesso e apagarmos os dados remotamente, e registre boletim de ocorrência. Danos (tela quebrada, líquido derramado): abra um chamado de Hardware; o notebook reserva é liberado em até 1 dia útil.",
    tags: ["perdi", "roubo", "roubaram", "furto", "notebook", "quebrou", "tela quebrada", "derramei", "caiu", "danificado"],
  },
  {
    id: "kb-17",
    title: "Conta bloqueada no Windows ou no e-mail",
    body: "A conta bloqueia após várias senhas erradas e desbloqueia sozinha em 30 minutos. Se precisar antes, abra um chamado de Acesso. Se bloquear com frequência, costuma ser uma senha antiga salva em algum aparelho (celular, Outlook em casa): atualize a senha lá também.",
    tags: ["conta bloqueada", "bloqueou", "bloqueio", "windows", "e-mail", "login", "tentativas", "acesso"],
  },
  {
    id: "kb-18",
    title: "Trabalhar de casa: o que preciso",
    body: "Para home office você precisa do notebook corporativo, do cliente de VPN (instalado pelo Portal de Softwares) e do MFA configurado no celular. Monitor, teclado e cadeira para casa são requisições de Hardware com aprovação do gestor.",
    tags: ["home office", "remoto", "casa", "trabalhar de casa", "vpn", "equipamento", "monitor"],
  },
  {
    id: "kb-19",
    title: "Novo funcionário ou desligamento: acessos",
    body: "Acessos iniciais e desligamentos são solicitados pelo gestor via RH; o service desk só executa depois da aprovação. Para incluir sistemas adicionais a um funcionário já ativo, abra uma requisição de Acesso informando o sistema e o perfil desejado.",
    tags: ["novo funcionário", "admissão", "onboarding", "desligamento", "demissão", "acessos", "perfil", "sistema"],
  },
  {
    id: "kb-20",
    title: "Assuntos que não são do service desk de TI",
    body: "Holerite, férias, benefícios e ponto: RH (rh@nexo.com). Reembolsos, notas fiscais e pagamentos: Financeiro (financeiro@nexo.com). Ar-condicionado, limpeza, crachá, vaga e toner: Facilities (facilities@nexo.com). O Nexo Assist atende só assuntos de TI.",
    tags: ["rh", "holerite", "férias", "benefício", "ponto", "financeiro", "reembolso", "nota fiscal", "facilities", "ar condicionado", "crachá", "vaga", "limpeza"],
  },
];
