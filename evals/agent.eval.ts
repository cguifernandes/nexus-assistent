/**
 * Avaliação do agent contra os casos de evals/cases.ts. Gasta tokens de verdade.
 * Roda com: npm run eval  (precisa de ANTHROPIC_API_KEY válida no .env)
 */
import fs from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { _setDb } from "@/lib/db";
import { seed } from "@/lib/seed";
import * as conversations from "@/services/conversations";
import { runAgent } from "@/mastra/run";
import type { Block, Employee, Message } from "@/lib/types";
import { CASES, type EvalCase } from "./cases";

interface Result {
  name: string;
  score: number;
  total: number;
  failed: string[];
  ms: number;
  tokens: number;
}
const results: Result[] = [];

async function runCase(c: EvalCase): Promise<Result> {
  const db = seed();
  _setDb(db);
  const employee = db.employees.find((e) => e.id === c.as) as Employee;
  const conv = conversations.create(employee.id);
  conversations.addMessage(conv, { role: "user", content: c.message });
  const blocks: Block[] = [];
  let message: Message | undefined;
  const started = Date.now();
  await runAgent(conv, employee, (e) => {
    if (e.type === "block") blocks.push(e.block);
    if (e.type === "done") message = e.message;
  });
  const trace = message?.trace;
  const called = new Set(trace?.steps.map((s) => s.tool) ?? []);
  const draft = blocks.find((b) => b.type === "draft");
  const text = `${message?.content ?? ""} ${blocks
    .flatMap((b) => (b.type === "options" ? b.options : []))
    .join(" ")}`;

  const intent = trace?.decision?.intent ?? "";
  const checks: [string, boolean][] = [["intent", c.intentIn ? c.intentIn.includes(intent) : intent === c.intent]];
  for (const t of c.mustCall ?? []) checks.push([`chamou ${t}`, called.has(t)]);
  for (const t of c.mustNotCall ?? []) checks.push([`não chamou ${t}`, !called.has(t)]);
  if (c.draft) {
    checks.push(["rascunho", draft?.type === "draft"]);
    if (draft?.type === "draft") {
      if (c.draft.priority) checks.push([`prioridade ${c.draft.priority}`, draft.draft.priority === c.draft.priority]);
      if (c.draft.type) checks.push([`tipo ${c.draft.type}`, draft.draft.type === c.draft.type]);
      if (c.draft.mode) checks.push([`modo ${c.draft.mode}`, draft.draft.mode === c.draft.mode]);
    }
  }
  if (c.reply) checks.push(["resposta", c.reply.test(text)]);

  const failed = checks.filter(([, ok]) => !ok).map(([n]) => n);
  return {
    name: c.name,
    score: checks.length - failed.length,
    total: checks.length,
    failed,
    ms: Date.now() - started,
    tokens: (trace?.usage?.inputTokens ?? 0) + (trace?.usage?.outputTokens ?? 0),
  };
}

describe("agent eval", () => {
  for (const c of CASES) {
    it(c.name, { timeout: 120_000 }, async () => {
      const r = await runCase(c);
      results.push(r);
      // Um caso "passa" com 70%+ dos critérios; a nota real está no relatório.
      expect(r.score / r.total, `falhou: ${r.failed.join(", ")}`).toBeGreaterThanOrEqual(0.7);
    });
  }

  afterAll(() => {
    const score = results.reduce((a, r) => a + r.score, 0);
    const total = results.reduce((a, r) => a + r.total, 0);
    const lines = results.map((r) => `${r.score === r.total ? "✓" : "✗"} ${r.name.padEnd(52)} ${r.score}/${r.total}  ${(r.ms / 1000).toFixed(1)}s  ${r.tokens} tok${r.failed.length ? `  falhou: ${r.failed.join(", ")}` : ""}`);
    const report = `${lines.join("\n")}\n\nNOTA: ${score}/${total} (${Math.round((100 * score) / total)}%) · ${results.reduce((a, r) => a + r.tokens, 0)} tokens · modelo ${process.env.LLM_MODEL ?? "anthropic/claude-opus-5-5"} · ${new Date().toISOString()}\n`;
    console.log(`\n${report}`);
    fs.writeFileSync("evals/last-report.txt", report);
  });
});
