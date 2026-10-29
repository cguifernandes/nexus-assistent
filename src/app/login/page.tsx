"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const EXAMPLES = [
  { email: "ana.souza@nexo.com", who: "Ana · funcionária com chamados" },
  { email: "bruno.lima@nexo.com", who: "Bruno · funcionário com VPN em andamento" },
  { email: "carla.mendes@nexo.com", who: "Carla · funcionária" },
  { email: "diego.rocha@nexo.com", who: "Diego · analista N1" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as { error?: string; user?: { role: string } };
    setBusy(false);
    if (!res.ok || !data.user) return setError(data.error ?? "Não foi possível entrar");
    router.push(data.user.role === "analyst" ? "/console" : "/chat");
  }

  return (
    <main className="flex-1 grid lg:grid-cols-2">
      <section className="hidden lg:flex flex-col justify-between bg-indigo-700 text-white p-12">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="font-semibold text-lg">Nexo Assist</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-semibold leading-tight">O service desk de TI, numa conversa.</h1>
          <p className="mt-4 text-indigo-100 text-lg">
            Tire dúvidas, acompanhe seus chamados, abra novos só conversando e fale com um analista quando precisar.
          </p>
          <ul className="mt-8 space-y-2 text-indigo-100">
            <li>• Respostas da central de ajuda, sem fila</li>
            <li>• Chamados com prioridade e prazo certos</li>
            <li>• Transparência: veja o que o agent fez e por quê</li>
          </ul>
        </div>
        <p className="text-indigo-200 text-sm">Nexo · Tecnologia da Informação</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <Logo dark />
            <span className="font-semibold text-lg">Nexo Assist</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Entrar</h2>
            <p className="text-slate-500 text-sm mt-1">Use seu e-mail corporativo.</p>
          </div>
          <label className="block text-sm">
            <span className="text-slate-700">E-mail corporativo</span>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome.sobrenome@nexo.com"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">Senha</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="qualquer senha"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-indigo-600 text-white py-2.5 font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? "Entrando…" : "Entrar"}
          </button>
          <div className="text-xs text-slate-500 border-t pt-4">
            <p className="mb-2">Contas de exemplo (qualquer senha):</p>
            <ul className="space-y-1">
              {EXAMPLES.map((x) => (
                <li key={x.email}>
                  <button type="button" className="text-indigo-600 hover:underline" onClick={() => setEmail(x.email)}>
                    {x.email}
                  </button>{" "}
                  <span className="text-slate-400">— {x.who}</span>
                </li>
              ))}
            </ul>
          </div>
        </form>
      </section>
    </main>
  );
}

function Logo({ dark }: { dark?: boolean }) {
  return (
    <span
      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl font-bold ${
        dark ? "bg-indigo-600 text-white" : "bg-white text-indigo-700"
      }`}
    >
      N
    </span>
  );
}
