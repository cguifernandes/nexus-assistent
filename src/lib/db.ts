import fs from "node:fs";
import path from "node:path";
import { after } from "next/server";
import type { Conversation, Employee, Ticket } from "./types";
import { seed } from "./seed";

export interface DB {
  employees: Employee[];
  tickets: Ticket[];
  conversations: Conversation[];
  counters: { INC: number; REQ: number; conv: number };
}

const FILE = path.resolve(process.env.DATA_FILE ?? path.join(process.cwd(), "data", "db.json"));

// Redis via REST (Upstash / Vercel KV). Na Vercel cada rota pode rodar numa instância diferente,
// com /tmp e memória próprios, então o arquivo local não serve: o JSON inteiro vai para uma chave.
// A integração da Vercel deixa o prefixo a escolha (UPSTASH_REDIS_REST_URL, KV_REST_API_URL, MEUPREFIXO_REST_API_URL...).
const envBy = (re: RegExp): string | undefined => Object.entries(process.env).find(([k]) => re.test(k))?.[1];
const REDIS_URL = envBy(/(REDIS_REST_URL|REST_API_URL)$/);
const REDIS_TOKEN = envBy(/(REDIS_REST_TOKEN|REST_API_TOKEN)$/);
if (process.env.VERCEL && !(REDIS_URL && REDIS_TOKEN)) {
  throw new Error("Na Vercel é preciso conectar um Upstash Redis ao projeto (Storage) e fazer redeploy; sem ele não há onde gravar os dados.");
}
const REDIS_KEY = "nexo-db";

// ponytail: one JSON blob, written whole on every mutation, last write wins between instances.
// Swap for Postgres when there is more than one analyst working at the same time or >10k tickets.
const g = globalThis as unknown as { __nexoDb?: DB };

async function redis(cmd: string, body?: string): Promise<string | null> {
  const res = await fetch(`${REDIS_URL}/${cmd}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    body,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis ${cmd.split("/")[0]}: HTTP ${res.status}`);
  return ((await res.json()) as { result: string | null }).result;
}

/** Carrega o estado atual antes de atender uma requisição. Sem Redis, usa o cache em memória + arquivo. */
export async function load(): Promise<DB> {
  if (REDIS_URL && REDIS_TOKEN) {
    const raw = await redis(`get/${REDIS_KEY}`);
    g.__nexoDb = raw ? (JSON.parse(raw) as DB) : seed();
    if (!raw) await redis(`set/${REDIS_KEY}`, JSON.stringify(g.__nexoDb));
  }
  return db();
}

export function db(): DB {
  if (!g.__nexoDb) {
    if (fs.existsSync(FILE)) {
      g.__nexoDb = JSON.parse(fs.readFileSync(FILE, "utf8")) as DB;
    } else {
      g.__nexoDb = seed();
      save();
    }
  }
  return g.__nexoDb;
}

const p = globalThis as unknown as { __nexoPending?: Promise<unknown> };

/** Espera a última gravação terminar. Chamado antes de responder, para o próximo GET (em outra instância) já ver a mudança. */
export async function flush(): Promise<void> {
  await p.__nexoPending;
}

export function save(): void {
  if (REDIS_URL && REDIS_TOKEN) {
    // ponytail: o blob inteiro é gravado; uma requisição longa (turno do agent, ~10 s) pode sobrescrever
    // uma mudança feita nesse meio tempo por outra instância. Chaves por conversa resolveriam.
    p.__nexoPending = redis(`set/${REDIS_KEY}`, JSON.stringify(g.__nexoDb)).catch((e) => console.error(e));
    try {
      after(p.__nexoPending); // garante a gravação mesmo se alguém responder sem flush()
    } catch {
      /* fora do contexto de requisição (testes) */
    }
    return;
  }
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(g.__nexoDb, null, 2));
}

/** Test helper: replace the in-memory DB without touching disk. */
export function _setDb(next: DB): void {
  g.__nexoDb = next;
}

export const uid = (): string => Math.random().toString(36).slice(2, 10);
export const now = (): string => new Date().toISOString();
