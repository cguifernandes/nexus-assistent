import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function PerfilPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return (
    <AppShell user={user} crumb="Meu perfil">
      <main className="flex-1 overflow-y-auto px-10 py-12">
        <div className="w-[600px] max-w-full space-y-8">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold">Meu perfil</h1>
            <p className="text-[14.5px] text-ink-3">Seus dados de acesso ao service desk de TI.</p>
          </div>

          <section className="rounded-2xl border border-line-card bg-paper">
            <div className="flex items-center gap-4 border-b border-rule px-6 py-5">
              <span className="w-40 text-[13.5px] text-ink-3">Nome</span>
              <span className="text-[14.5px] font-medium">{user.name}</span>
            </div>
            <div className="flex items-center gap-4 px-6 py-5">
              <span className="w-40 text-[13.5px] text-ink-3">E-mail corporativo</span>
              <span className="space-y-0.5">
                <span className="block text-[14.5px] font-medium">{user.email}</span>
                <span className="block text-[12.5px] text-ink-3">Gerenciado pela TI · {user.department}</span>
              </span>
            </div>
          </section>

          <section className="rounded-2xl border border-line-card bg-paper">
            <div className="flex items-center gap-4 p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-desk text-ink-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              </span>
              <span className="flex-1 space-y-0.5">
                <span className="block text-[14.5px] font-semibold">Senha</span>
                <span className="block text-[13.5px] text-ink-3">A senha da rede Nexo é gerenciada pela TI.</span>
              </span>
              <span className="h-9 rounded-lg border border-line px-3.5 text-[13.5px] font-medium leading-9 text-ink-3">Redefinir senha</span>
            </div>
            <div className="border-t border-rule bg-desk px-6 py-3 text-[13px] text-ink-3">
              Para redefinir, acesse senha.nexo.com ou peça ajuda ao Nexo Assist em Atendimento.
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
