import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { TicketCard } from "@/components/Blocks";
import * as tickets from "@/services/tickets";
import * as conversations from "@/services/conversations";
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
  const convs = conversations.listByEmployee(user.id).map(conversations.summarize);
  // Clicar num chamado abre a conversa ligada a ele, se houver. Resposta nova do analista = borda azul.
  const convByTicket = new Map<string, (typeof convs)[number]>();
  for (const c of convs) {
    if (!c.ticketId) continue;
    const cur = convByTicket.get(c.ticketId);
    if (!cur || (cur.status === "closed" && c.status !== "closed")) convByTicket.set(c.ticketId, c);
  }
  const card = (t: TicketView) => {
    const conv = convByTicket.get(t.id);
    const unread = (conv?.unreadFromAnalyst ?? 0) > 0;
    const muted = !t.open;
    const inner = (
      <div className={`relative rounded-2xl ${unread ? "ring-2 ring-primary" : ""} ${muted ? "opacity-60 grayscale-[.3]" : ""}`}>
        {unread && (
          <span className="absolute -top-2.5 right-4 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
            {conv!.unreadFromAnalyst === 1 ? "1 resposta do analista" : `${conv!.unreadFromAnalyst} respostas do analista`}
          </span>
        )}
        <TicketCard ticket={t} />
      </div>
    );
    return conv ? (
      <Link key={t.id} href={`/chat?c=${conv.id}`} className="block rounded-2xl transition hover:ring-2 hover:ring-primary/40">
        {inner}
      </Link>
    ) : (
      <div key={t.id}>{inner}</div>
    );
  };

  return (
    <AppShell
      user={user}
      crumb="Atendimento"
      status={
        <Link href="/chat" className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-paper px-3 text-[13.5px] font-medium text-ink-2 hover:border-primary hover:bg-primary-soft hover:text-primary-text">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
          </svg>
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

          {list && list.length > 0 && <div className="space-y-3">{[...open, ...closed].map(card)}</div>}
        </div>
      </main>
    </AppShell>
  );
}
