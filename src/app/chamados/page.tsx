import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { TicketCard } from "@/components/Blocks";
import * as tickets from "@/services/tickets";
import type { TicketView } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Lista de chamados do funcionário logado (nav "Atendimento"). */
export default async function ChamadosPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  let list: TicketView[] | null = null;
  try {
    list = await tickets.withRetry(() => tickets.listByEmployee(user.id));
  } catch {
    list = null;
  }
  const open = list?.filter((t) => t.open) ?? [];
  const closed = list?.filter((t) => !t.open) ?? [];

  return (
    <AppShell
      user={user}
      crumb="Atendimento"
      status={
        <Link href="/chat" className="flex h-9 items-center gap-1.5 rounded-lg bg-cta px-3.5 text-[13.5px] font-semibold text-white hover:bg-cta-hover">
          Falar com o Nexo Assist
        </Link>
      }
    >
      <main className="flex-1 overflow-y-auto px-10 py-10">
        <div className="mx-auto w-[760px] max-w-full space-y-8">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold">Meus chamados</h1>
            <p className="text-[14.5px] text-ink-3">
              {list === null
                ? "O sistema de chamados está temporariamente indisponível. Recarregue a página em instantes."
                : `${open.length} em aberto · ${closed.length} encerrados`}
            </p>
          </div>

          {list !== null && list.length === 0 && (
            <div className="rounded-2xl border border-line-card bg-paper p-8 text-center">
              <p className="text-[15.5px] font-semibold">Você ainda não tem chamados.</p>
              <p className="mt-1 text-[13.5px] text-ink-3">Descreva o problema para o Nexo Assist e ele abre o chamado com você.</p>
              <Link href="/chat" className="mt-4 inline-flex h-9 items-center rounded-lg bg-cta px-3.5 text-[13.5px] font-semibold text-white hover:bg-cta-hover">
                Abrir conversa
              </Link>
            </div>
          )}

          {open.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-[12.5px] font-semibold text-ink-3">Em aberto</h2>
              {open.map((t) => (
                <TicketCard key={t.id} ticket={t} />
              ))}
            </section>
          )}
          {closed.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-[12.5px] font-semibold text-ink-3">Encerrados</h2>
              {closed.map((t) => (
                <TicketCard key={t.id} ticket={t} />
              ))}
            </section>
          )}
        </div>
      </main>
    </AppShell>
  );
}
