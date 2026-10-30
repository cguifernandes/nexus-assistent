# Nexo Assist — agent do service desk de TI

Chat em que o funcionário da Nexo descreve o problema com as próprias palavras e o agent consulta os chamados dele, busca na central de ajuda, abre ou atualiza chamados (sempre com rascunho e confirmação) e transfere para um analista quando precisa. Inclui o console do analista e a visibilidade completa das decisões do agent em cada resposta.

OBS: Tentei deixar o design o mais parecido com o documento porém adicionei algumas telas novas

## Como rodar

```bash
npm install          # o .npmrc já aplica legacy-peer-deps (vitest 5 x @types/node 22)
cp .env.example .env # preencha ANTHROPIC_API_KEY e SESSION_SECRET
npm run dev          # http://localhost:3000
```

Requer Node 22.

Outros comandos: `npm test` (unitários), `npm run eval` (avaliação do agent contra o modelo, gasta tokens), `npm run typecheck`, `npm run lint`, `npm run build && npm start`.

Contas:

| E-mail | Senha | Perfil |
|---|---|---|
| teste@nexo.com | `teste123` (hash scrypt no seed) | Funcionário sem chamados nem conversas |
| assistente@nexo.com | `assistente123` | Analista do service desk (console) que também tem chamados de exemplo: um incidente vencido, um em andamento, uma requisição aprovada e dois resolvidos |

Os dados ficam em `data/db.json` (criado no primeiro acesso a partir de `src/lib/seed.ts`). Apague o arquivo para voltar ao estado inicial.

## Arquitetura

```
src/
  app/            Next.js (App Router): telas + rotas de API
    login/        Tela 1
    tickets/      Atendimento: chamados e conversas do funcionário
    chat/         Telas 2 e 3 (chat com o agent)
    profile/      Meu perfil
    console/      Telas 4 e 5 (analista); o shell fica no layout e persiste entre conversas
    api/          auth, conversations (SSE), console
  components/     UI (AppShell, Chat, Messages, Blocks, Trace, Console*)
  mastra/         O agent
    agent.ts      instruções (regras do Anexo A, exemplos, segurança) + modelo
    tools.ts      ferramentas que o agent pode chamar
    run.ts        roda um turno, transforma o stream em eventos e grava o trace
    ready.ts      verifica se a chave do provedor é aceita (badge online/offline)
  services/       Serviços de domínio, sem nada de LLM
    tickets.ts    serviço de chamados simulado (instável de propósito)
    helpcenter.ts busca na central de ajuda
    conversations.ts conversas, status, rascunhos e "visto"
  lib/            tipos, persistência (JSON), JWT de sessão, senha (scrypt), rate limit, artigos, seed
tests/            unitários (vitest)
evals/            avaliação do agent contra o modelo
```

Três camadas, cada uma só fala com a de baixo:

- **Interface** (React, client components) fala com as rotas de API. Nunca importa o agent nem os serviços.
- **Agent** (Mastra) só conhece o mundo pelas ferramentas em `tools.ts`. As ferramentas chamam os serviços e devolvem resultados compactos para o modelo, e opcionalmente um `block` (card de chamado, rascunho, opções) que vai para a UI sem passar pelo modelo.
- **Serviços** não sabem que existe LLM. O serviço de chamados é o único caminho para ler ou escrever chamados, exige o `employeeId` em toda chamada e só devolve chamados daquele funcionário. Ele falha aleatoriamente (`TICKET_OUTAGE_RATE`, padrão 15%) para simular o legado; as ferramentas fazem 3 tentativas com backoff antes de avisar o funcionário.

**Persistência.** Um único JSON em disco (`lib/db.ts`), escrito inteiro a cada mutação e mantido em `globalThis` para sobreviver ao hot reload. Conversas, mensagens, traces, rascunhos, chamados e o status de cada conversa (`agent`, `waiting_analyst`, `with_analyst`, `closed`) sobrevivem a um reinício. É deliberadamente a solução mais simples que atende o requisito; ver trade-offs.

**Tempo real.** O envio de mensagem responde em Server-Sent Events: `step` (ação do agent, vira o chip acima da resposta), `text` (delta do texto), `block` (card) e `done`. Mensagens do analista e mudanças de status chegam por polling curto (3 s quando a conversa está com analista, 8 s com o agent).

**Sessão.** Login emite um JWT (HS256 via `jose`, `sub` = id do funcionário, `iat`, `exp`) guardado em cookie `httpOnly`, `sameSite: lax`, `secure` em produção. Toda requisição à API verifica assinatura e expiração em `currentUser`; token inválido ou vencido devolve 401 (ou redireciona ao login nas páginas). Validade padrão de 8 h (`SESSION_TTL_SECONDS`), renovada a cada chamada de API quando passou da metade do prazo (sessão deslizante). `SESSION_SECRET` é obrigatório em produção. As rotas do console exigem `role: analyst`. Chamados nunca são filtrados no cliente: o filtro por funcionário está no serviço.

**Interface.** Segue o protótipo Pencil do Anexo C: tokens de cor, raios e tipografia (Newsreader para títulos, Schibsted Grotesk na UI, IBM Plex Mono para ids) estão em `src/app/globals.css`; sidebar e top bar em `AppShell`, console em `ConsoleShell`. Atalhos do protótipo: teclas 1–5 escolhem uma opção rápida e Ctrl/⌘+Enter confirma o rascunho.

## Como o agent decide

Um único agent Mastra com 9 ferramentas e instruções que transcrevem o Anexo A. A cada mensagem:

1. **`recordDecision`** é obrigatório e vem primeiro: intenção (`duvida`, `consulta_chamado`, `abrir_chamado`, `atualizar_chamado`, `falar_com_analista`, `fora_de_escopo`…), segurança de 0 a 1, raciocínio e ação planejada. Se a segurança for < 0,4 a própria ferramenta devolve a dica de perguntar ou transferir.
2. O agent usa as ferramentas que precisar, em até 8 passos: `searchHelpCenter`, `listMyTickets`, `showTickets` (cards, com seleção quando há mais de um candidato), `findSimilarTickets`, `proposeDraft`, `applyDraft`, `offerOptions` (botões de resposta rápida), `transferToAnalyst`.
3. Responde em texto curto. Os cards já mostram os dados; o texto comenta.

As regras que importam não dependem só do prompt; estão também no código:

- **Confirmação antes de criar/atualizar.** `proposeDraft` só grava um rascunho na conversa e devolve o card com Confirmar/Ajustar. `applyDraft` recusa se a última mensagem do funcionário não for uma confirmação, e recusa rascunhos já aplicados.
- **Sem duplicidade.** O prompt manda chamar `findSimilarTickets` antes de propor; além disso `proposeDraft` roda a mesma busca e anexa `possibleDuplicates` ao card. Chamados resolvidos há até 7 dias aparecem como reabríveis (`reopenable`) e o serviço recusa reabrir os mais antigos.
- **Prioridade e prazo.** A tabela do Anexo A está no prompt; o prazo (`dueAt`, `overdue`) é calculado pelo serviço em horas úteis (seg–sex, 8h–18h; Crítica é relógio corrido). O agent não inventa prazo.
- **Chamados no console.** O analista resolve qualquer chamado do funcionário pelo painel lateral (botão "Resolver"), mesmo com a conversa encerrada; encerrar um atendimento também resolve o chamado daquela conversa. Ao resolver, uma mensagem de sistema entra na conversa de origem do chamado e o funcionário vê o aviso.
- **Transferência.** `transferToAnalyst` muda o status da conversa para `waiting_analyst` e grava o resumo. A partir daí a rota de mensagens não chama mais o agent: a mensagem do funcionário fica registrada e vai para o analista. O analista assume (`with_analyst`), responde, devolve ao agent ou encerra.
- **Privacidade.** O `employeeId` vem do cookie, entra no `RequestContext` do Mastra e é lido pelas ferramentas; o modelo nunca recebe nem escolhe o id do funcionário.
- **Limite de 30 mensagens** por conversa, contado no servidor; ao atingir, a conversa é encerrada e a UI oferece uma nova.

**Modelo.** Padrão `anthropic/claude-opus-5-5` pelo model router do Mastra (string `provider/model`, chave em `ANTHROPIC_API_KEY`). Escolhi a Anthropic porque a família Claude segue bem instruções longas com regras de negócio e chama ferramentas de forma confiável, que é o que este agent exige (9 ferramentas, ordem obrigatória, confirmação). `LLM_MODEL=anthropic/claude-haiku-5-5` troca para o modelo mais barato sem mudar código; o trace mostra tokens por resposta para comparar custo e qualidade.

**Custo por conversa.** As instruções são um prefixo fixo (cacheável pelo provedor); o que varia (funcionário, data, rascunho pendente) entra como mensagem de sistema no fim. O histórico reenviado é só texto das últimas 24 mensagens; resultados de ferramentas não são reenviados. As ferramentas devolvem resumos compactos dos chamados, não o objeto inteiro. `maxOutputTokens` 1200.

## Transparência (a parte mais importante)

Cada resposta do agent carrega um `trace` persistido com a mensagem:

- **Linha de ações acima da resposta**: uma por ferramenta (“Classificou o pedido”, “Consultou seus chamados”, “Verificou duplicidade”, “Montou um rascunho”, “Transferiu para um analista”). Aparece em tempo real, conforme o agent chama as ferramentas.
- **“Ver detalhes”** abre: o que o agent entendeu (intenção), a segurança (barra 0–100%), o porquê e a ação planejada; a lista de ferramentas chamadas com argumentos, resultado e duração; e modelo, tempo total e tokens de entrada/saída.

O mesmo trace aparece no console do analista, que também vê o resumo que o agent escreveu ao transferir e o motivo (pedido do funcionário, caso crítico, chamado vencido, sem segurança).

## Como garanti a qualidade das decisões

- **Regras críticas em código, não só no prompt**: confirmação antes de aplicar rascunho, posse do chamado, janela de 7 dias para reabrir, limite de mensagens, pausa do agent quando a conversa está com analista. Se o modelo errar, a ferramenta recusa e explica, e o erro fica visível no trace.
- **Segurança explícita**: o agent precisa declarar a confiança antes de agir; abaixo de 0,4 a ferramenta o empurra para perguntar ou transferir, atendendo “quando o agent não tem segurança sobre o que fazer”.
- **Avaliação do agent** (`npm run eval`): 15 conversas em `evals/cases.ts` com a decisão esperada (intenção, ferramentas que deve e não deve chamar, tipo/prioridade/modo do rascunho, trecho da resposta). Roda contra o modelo de verdade e imprime a nota por caso e por critério (também em `evals/last-report.txt`). Baseline com Claude Opus 5.5: 97% dos critérios, ~235 mil tokens por rodada. É assim que mudanças no prompt são medidas em vez de chutadas.
- **Exemplos no prompt**: além das regras, as instruções trazem nove exemplos curtos de condução (dúvida, VPN no Windows 11, equipamento, crítico, consulta com vários chamados, analista, RH, reabertura, mensagem vaga).
- **Central de ajuda** com 20 artigos em `src/lib/articles.ts`, com sinônimos nas tags porque a busca é por palavras. Conteúdo estático, fora do `db.json`.
- **Testes** (`tests/tickets.test.ts`) nas regras determinísticas: horas úteis, vencimento, reabertura, privacidade, duplicidade, retry do legado, busca da central de ajuda, assinatura da sessão.
- **Dados de exemplo com casos de borda**: chamado vencido, resolvido há 4 dias (reabrível) e há 20 dias (não), VPN 809 em Windows 11 (artigo manda abrir chamado).
- **Trace em toda resposta**: o avaliador vê exatamente por que o agent fez o que fez, e eu usei isso para ajustar as instruções.

## Trade-offs

- **JSON em disco em vez de banco.** Atende “sobreviver a reinício” com zero dependências; não serve para mais de um processo nem para disco efêmero (ver Deploy). Trocar por SQLite/Postgres é mexer só em `lib/db.ts`.
- **Serviço de chamados em processo, não um servidor separado.** A fronteira é um módulo com API própria e simulação de indisponibilidade; virar um HTTP service é só trocar a implementação das funções. Evita rodar dois processos para avaliar.
- **Polling para o analista, SSE só para o agent.** Simples e suficiente para o volume do protótipo; WebSocket/SSE bidirecional seria o próximo passo.
- **Histórico só de texto.** Cards e resultados de ferramentas não voltam para o modelo (economia de tokens). O rascunho pendente é reinjetado no contexto para o agent saber o que está esperando confirmação.
- **Sem memória do Mastra.** A conversa já é persistida pela aplicação e precisa ser lida pelo console; usar a memória do Mastra duplicaria o estado.
- **Duplicidade por palavras.** Similaridade por sobreposição de termos; funciona para a base de exemplo, embeddings seriam o upgrade.
- **Horas úteis sem feriados.**

## O que faria com mais tempo

- Rodar a avaliação em CI a cada mudança de prompt, com mais casos multi-turno (confirmação, ajuste de rascunho, analista devolvendo ao agent).
- Streaming bidirecional (WebSocket) para analista e funcionário, com indicador de “digitando”.
- Edição do rascunho em formulário, além do ajuste por texto.
- Banco relacional, migrações e um serviço de chamados HTTP de verdade com contrato OpenAPI.
- Orçamento de tokens por conversa e limites compartilhados (Redis) para rodar com mais de uma instância.
- Busca semântica (embeddings) na central de ajuda.

## Segurança do agent

- **Limites por usuário** (`lib/ratelimit.ts`): 10 mensagens ao assistente por minuto e 150 por dia, configuráveis por `AGENT_MSGS_PER_MINUTE` e `AGENT_MSGS_PER_DAY`; além disso cada conversa tem no máximo 30 mensagens, cada mensagem 2000 caracteres, e cada resposta do agent no máximo 8 passos e 1200 tokens de saída. Os contadores ficam em memória (um processo); com mais de uma instância, mova para Redis ou banco.
- **Prompt injection**: as regras que importam não dependem do modelo obedecer. A identidade vem do cookie e entra nas ferramentas pelo `RequestContext`, nunca do texto; `applyDraft` recusa sem confirmação direta; posse de chamado, janela de reabertura e pausa do agent são verificadas no serviço. As instruções ainda mandam o agent tratar mensagens, artigos e resultados de ferramentas como dados, recusar troca de papel ou de regras, e não revelar o prompt. O pior caso de uma injeção bem-sucedida é uma resposta de texto errada, visível no trace, nunca uma ação fora das regras.

