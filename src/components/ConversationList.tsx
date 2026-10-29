import Link from "next/link";
import type { ConversationSummary } from "@/services/conversations";
import { StatusPill, shortWhen } from "./ui";

/** Conversas do funcionário na tela Atendimento (server component). */
export function ConversationList({ items }: { items: ConversationSummary[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-[12.5px] font-semibold text-ink-3">Conversas</h2>
      <div className="overflow-hidden rounded-2xl border border-line-card bg-paper">
        {items.map((c, i) => {
          const unread = c.unreadFromAnalyst > 0;
          return (
            <Link key={c.id} href={`/chat?c=${c.id}`} className={`flex items-center gap-3 px-4 py-3 hover:bg-desk/60 ${i > 0 ? "border-t border-rule" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`truncate text-[14.5px] ${unread ? "font-semibold" : "font-medium"}`}>
                    {c.lastRole === "analyst" ? "Analista: " : c.lastRole === "assistant" ? "Nexo: " : ""}
                    {c.lastMessage.replace(/\*\*/g, "") || "(sem mensagens)"}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[12.5px] text-ink-3">
                  <span>{shortWhen(c.updatedAt)}</span>
                  {c.ticketId && (
                    <>
                      <span>·</span>
                      <span className="font-mono">{c.ticketId}</span>
                    </>
                  )}
                </div>
              </div>
              {unread && <span className="rounded-full bg-cta px-2 py-0.5 text-[11.5px] font-bold text-white">{c.unreadFromAnalyst} do analista</span>}
              <StatusPill status={c.status} label={c.status === "agent" ? "Com o agent" : undefined} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
