import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import type { Employee } from "./types";

const COOKIE = "nexo_session";
const SECRET = process.env.SESSION_SECRET ?? "dev-secret-change-me";

const sign = (payload: string): string => createHmac("sha256", SECRET).update(payload).digest("base64url");

export function encodeSession(employeeId: string): string {
  const payload = Buffer.from(JSON.stringify({ employeeId })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): string | undefined {
  if (!token) return undefined;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return undefined;
  const expected = sign(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return undefined;
  try {
    const { employeeId } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { employeeId?: string };
    return employeeId;
  } catch {
    return undefined;
  }
}

export async function currentUser(): Promise<Employee | undefined> {
  const id = decodeSession((await cookies()).get(COOKIE)?.value);
  return id ? db().employees.find((e) => e.id === id) : undefined;
}

export async function setSessionCookie(employeeId: string): Promise<void> {
  (await cookies()).set(COOKIE, encodeSession(employeeId), { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export function findByEmail(email: string): Employee | undefined {
  const e = email.trim().toLowerCase();
  return db().employees.find((x) => x.email === e);
}
