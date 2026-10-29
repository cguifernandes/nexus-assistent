/**
 * Limite de mensagens ao agent por usuário: por minuto e por dia.
 * Protege a chave do provedor contra abuso e custo inesperado.
 */
// ponytail: contadores em memória; zeram ao reiniciar e valem para um processo só.
// Trocar por Redis/banco se houver mais de uma instância.
const PER_MINUTE = Number(process.env.AGENT_MSGS_PER_MINUTE ?? 10);
const PER_DAY = Number(process.env.AGENT_MSGS_PER_DAY ?? 150);

const minute = new Map<string, { at: number; n: number }>();
const day = new Map<string, { at: number; n: number }>();

function bump(map: Map<string, { at: number; n: number }>, key: string, windowMs: number, limit: number): boolean {
  const now = Date.now();
  const cur = map.get(key);
  if (!cur || now - cur.at >= windowMs) {
    map.set(key, { at: now, n: 1 });
    return true;
  }
  if (cur.n >= limit) return false;
  cur.n += 1;
  return true;
}

/** Devolve a mensagem de erro se o usuário estourou um limite; undefined se pode seguir. */
export function checkAgentRate(userId: string): string | undefined {
  if (!bump(minute, userId, 60_000, PER_MINUTE)) return `Muitas mensagens em pouco tempo. Aguarde um minuto (limite: ${PER_MINUTE} por minuto).`;
  if (!bump(day, userId, 86_400_000, PER_DAY)) return `Limite diário de ${PER_DAY} mensagens ao assistente atingido. Tente amanhã ou fale com um analista.`;
  return undefined;
}

/** Test helper. */
export function _resetRate(): void {
  minute.clear();
  day.clear();
}
