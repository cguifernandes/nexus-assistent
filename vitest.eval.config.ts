import { defineConfig } from "vitest/config";
import fs from "node:fs";
import path from "node:path";

// Carrega o .env (chave do provedor) sem depender de dotenv.
const env: Record<string, string> = {};
try {
  for (const line of fs.readFileSync(path.resolve(__dirname, ".env"), "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && m[1] && !process.env[m[1]]) env[m[1]] = m[2]!.replace(/^["']|["']$/g, "");
  }
} catch {
  /* sem .env: a avaliação falha com a mensagem de chave ausente */
}

export default defineConfig({
  test: {
    include: ["evals/**/*.eval.ts"],
    env: { ...env, TICKET_OUTAGE_RATE: "0", DATA_FILE: path.join(__dirname, "data", "eval-tmp.json") },
    fileParallelism: false,
    sequence: { concurrent: false },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
