import { NextResponse } from "next/server";
import { currentUser } from "./auth";
import { flush } from "./db";
import type { Employee, Role } from "./types";

/** Resposta JSON; antes, espera as gravações pendentes terminarem (ver lib/db.ts). */
export async function json(body: unknown, status = 200): Promise<NextResponse> {
  await flush();
  return NextResponse.json(body, { status });
}

/** Devolve o usuário logado ou uma resposta de erro pronta. */
export async function requireUser(role?: Role): Promise<Employee | NextResponse> {
  const user = await currentUser();
  if (!user) return json({ error: "Não autenticado" }, 401);
  if (role && user.role !== role) return json({ error: "Sem permissão" }, 403);
  return user;
}

export const isResponse = (x: unknown): x is NextResponse => x instanceof NextResponse;
