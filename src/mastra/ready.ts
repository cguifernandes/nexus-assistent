/**
 * Verifica se o agent pode responder: a chave do provedor precisa existir e ser aceita.
 * O resultado fica em cache por 60 s para não bater na API a cada requisição.
 */
export interface AgentHealth {
  ok: boolean;
  reason?: string;
}

let cache: { at: number; value: AgentHealth } | undefined;
const TTL_MS = 60_000;

export async function agentHealth(): Promise<AgentHealth> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const value = await probe();
  cache = { at: Date.now(), value };
  return value;
}

/** Invalida o cache (ex.: depois de um erro de autenticação numa chamada real). */
export function markAgentDown(reason: string): void {
  cache = { at: Date.now(), value: { ok: false, reason } };
}

async function probe(): Promise<AgentHealth> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, reason: "ANTHROPIC_API_KEY não está definida no .env." };
  try {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=1", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return { ok: true };
    if (res.status === 401) return { ok: false, reason: "ANTHROPIC_API_KEY foi recusada pelo provedor (chave inválida)." };
    return { ok: false, reason: `Provedor respondeu ${res.status} ao validar a chave.` };
  } catch (e) {
    return { ok: false, reason: `Não foi possível validar a chave: ${e instanceof Error ? e.message : String(e)}` };
  }
}
