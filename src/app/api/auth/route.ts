import { clearSessionCookie, currentUser, findByEmail, setSessionCookie } from "@/lib/auth";
import { json } from "@/lib/api";

/** GET: usuário logado. POST: login. DELETE: logout. */
export async function GET() {
  const user = await currentUser();
  return user ? json({ user }) : json({ error: "Não autenticado" }, 401);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  if (!body.email || !body.password) return json({ error: "Informe e-mail e senha" }, 400);
  const user = findByEmail(body.email);
  if (!user) return json({ error: "E-mail não encontrado. Use um e-mail corporativo cadastrado." }, 401);
  await setSessionCookie(user.id);
  return json({ user });
}

export async function DELETE() {
  await clearSessionCookie();
  return json({ ok: true });
}
