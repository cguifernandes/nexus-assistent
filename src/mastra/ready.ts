/** O agent só responde com a chave do provedor configurada. */
export const agentReady = Boolean(process.env.ANTHROPIC_API_KEY);
