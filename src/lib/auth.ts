import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";
import { verifyPassword } from "./password";
import type { Employee } from "./types";

const COOKIE = "nexo_session";
const ALG = "HS256";
/** Validade da sessão, em segundos. Renovada a cada requisição válida (sliding). */
export const SESSION_TTL = Number(process.env.SESSION_TTL_SECONDS ?? 8 * 3600);

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET é obrigatório em produção");
  return new TextEncoder().encode(s ?? "dev-secret-change-me");
}

export async function signSession(employeeId: string, ttl = SESSION_TTL): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: ALG })
    .setSubject(employeeId)
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(secret());
}

/** Verifica assinatura e expiração; devolve o employeeId e quando expira. */
export async function verifySession(token: string | undefined): Promise<{ employeeId: string; exp: number } | undefined> {
  if (!token) return undefined;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: [ALG] });
    return payload.sub && payload.exp ? { employeeId: payload.sub, exp: payload.exp } : undefined;
  } catch {
    return undefined;
  }
}

async function write(token: string): Promise<void> {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

/**
 * Usuário da sessão atual. Valida o JWT em toda chamada; token inválido ou vencido = sem usuário.
 * Em route handlers, renova o cookie quando passou da metade da validade.
 */
export async function currentUser(): Promise<Employee | undefined> {
  const session = await verifySession((await cookies()).get(COOKIE)?.value);
  if (!session) return undefined;
  const user = db().employees.find((e) => e.id === session.employeeId);
  if (!user) return undefined;
  if (session.exp - Date.now() / 1000 < SESSION_TTL / 2) {
    // Server Components não podem gravar cookie; a renovação acontece na próxima chamada de API.
    await write(await signSession(user.id)).catch(() => undefined);
  }
  return user;
}

export async function setSessionCookie(employeeId: string): Promise<void> {
  await write(await signSession(employeeId));
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export function findByEmail(email: string): Employee | undefined {
  const e = email.trim().toLowerCase();
  return db().employees.find((x) => x.email === e);
}

/** Confere a senha contra o hash scrypt do seed. */
export function checkPassword(user: Employee, password: string): boolean {
  return !!user.passwordHash && verifyPassword(password, user.passwordHash);
}

/** Versão do funcionário sem o hash de senha, para respostas da API. */
export function publicEmployee(e: Employee): Omit<Employee, "passwordHash"> {
  const copy = { ...e };
  delete copy.passwordHash;
  return copy;
}
