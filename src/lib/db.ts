import fs from "node:fs";
import path from "node:path";
import type { Conversation, Employee, Ticket } from "./types";
import { seed } from "./seed";

export interface DB {
  employees: Employee[];
  tickets: Ticket[];
  conversations: Conversation[];
  counters: { INC: number; REQ: number; conv: number };
}

const FILE = path.resolve(process.env.DATA_FILE ?? path.join(process.cwd(), "data", "db.json"));

// ponytail: single JSON file, written whole on every mutation. Fine for one process;
// swap for SQLite/Postgres when there is more than one instance or >10k tickets.
const g = globalThis as unknown as { __nexoDb?: DB };

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

export function save(): void {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(g.__nexoDb, null, 2));
}

/** Test helper: replace the in-memory DB without touching disk. */
export function _setDb(next: DB): void {
  g.__nexoDb = next;
}

export const uid = (): string => Math.random().toString(36).slice(2, 10);
export const now = (): string => new Date().toISOString();
