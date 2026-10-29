"use client";

import type { Block, TicketView } from "@/lib/types";
import { PRIORITY_DOT, TicketStatusDot, fmtDate, shortWhen, timeAgo } from "./ui";

export interface BlockActions {
  send: (text: string) => void;
  prefill: (text: string) => void;
}

const CARD = "w-full rounded-2xl border border-line-card bg-paper shadow-[0_1px_2px_rgba(27,36,49,.04),0_8px_24px_-12px_rgba(27,36,49,.18)]";

/** Card de chamado completo (Tela 3). */
export function TicketCard({ ticket: t }: { ticket: TicketView }) {
  return (
    <div className={CARD}>
      <div className="space-y-1.5 px-[18px] pb-3.5 pt-4">
        <div className="flex items-center gap-2 pb-0.5 text-[12.5px] text-ink-3">
          <span className="font-medium">{t.type === "INC" ? "Chamado" : "Requisição"}</span>
          <span className="h-[3px] w-[3px] rounded-full bg-rule" />
          <span className="font-mono">{t.id}</span>
          <span className="flex-1" />
          <TicketStatusDot status={t.status} strong />
        </div>
        <div className="text-lg font-semibold leading-snug">{t.title}</div>
        <p className="text-[13.5px] text-ink-2">{t.description}</p>
      </div>
      <div className="px-[18px] pb-4">
        <dl className="grid grid-cols-2 gap-6 border-t border-rule pt-3 sm:grid-cols-4">
          <Field k="Categoria" v={t.category} />
          <Field
            k="Prioridade"
            v={
              <span className="inline-flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[t.priority]}`} />
                {t.priority}
              </span>
            }
          />
          <Field k="Aberto em" v={fmtDate(t.createdAt)} />
          <Field
            k="Última atualização"
            v={
              <span className={t.overdue ? "text-warning-text" : ""}>
                {timeAgo(t.updatedAt)}
                <span className="font-normal text-ink-3"> · {t.overdue ? "prazo vencido" : t.open ? `prazo ${t.slaLabel}` : "encerrado"}</span>
              </span>
            }
          />
        </dl>
      </div>
    </div>
  );
}

/** Seleção entre chamados (Tela 3). */
function TicketSelector({ tickets, onSelect }: { tickets: TicketView[]; onSelect?: (t: TicketView) => void }) {
  return (
    <div className={`${CARD} overflow-hidden`}>
      {tickets.map((t, i) => {
        const row = (
          <>
            <span className={`h-4 w-4 shrink-0 rounded-full border ${onSelect ? "border-line" : "border-rule"} bg-paper`} />
            <span className="w-[86px] shrink-0 font-mono text-[12.5px] font-medium text-ink-3">{t.id}</span>
            <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium">{t.title}</span>
            <TicketStatusDot status={t.status} />
            <span className="w-12 text-right text-[12.5px] text-ink-3">{shortWhen(t.updatedAt)}</span>
          </>
        );
        const cls = `flex h-[46px] w-full items-center gap-3.5 px-4 text-left ${i > 0 ? "border-t border-rule" : ""}`;
        return onSelect ? (
          <button key={t.id} type="button" onClick={() => onSelect(t)} className={`${cls} hover:bg-cta/5`}>
            {row}
          </button>
        ) : (
          <div key={t.id} className={cls}>
            {row}
          </div>
        );
      })}
    </div>
  );
}

/** Renderiza os blocos de uma resposta. `active` habilita botões (só na última resposta). */
export function Blocks({ blocks, active, actions }: { blocks: Block[]; active: boolean; actions?: BlockActions }) {
  if (!blocks.length) return null;
  return (
    <div className="mt-2 space-y-2">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "tickets":
            return b.selectable ? (
              <TicketSelector key={i} tickets={b.tickets} onSelect={active && actions ? (t) => actions.send(`${t.id} · ${t.title}`) : undefined} />
            ) : (
              <div key={i} className="space-y-2">
                {b.tickets.map((t) => (
                  <TicketCard key={t.id} ticket={t} />
                ))}
              </div>
            );
          case "draft": {
            const d = b.draft;
            const kind = d.mode === "create" ? "Novo chamado" : d.mode === "update" ? `Complemento ao ${d.ticketId}` : `Reabertura do ${d.ticketId}`;
            const canAct = active && !d.applied && actions;
            return (
              <div key={i} className={`${CARD} overflow-hidden`}>
                <div className="space-y-1.5 px-[18px] pb-3.5 pt-4">
                  <div className="flex items-center gap-2 pb-0.5 text-[12.5px] text-ink-3">
                    <span className="font-medium">{kind}</span>
                    <span className="h-[3px] w-[3px] rounded-full bg-rule" />
                    <span className="font-mono">Rascunho {d.id}</span>
                    <span className="flex-1" />
                    {d.applied ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-success-text">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                        Registrado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 font-medium text-warning-text">
                        <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                        Aguardando confirmação
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-semibold leading-snug">{d.title}</div>
                  <p className="whitespace-pre-wrap text-[13.5px] text-ink-2">{d.description}</p>
                </div>
                <div className="px-[18px] pb-4">
                  <dl className="grid grid-cols-2 gap-6 border-t border-rule pt-3 sm:grid-cols-3">
                    <Field k="Categoria" v={`${d.category} · ${d.type}`} />
                    <Field
                      k="Prioridade"
                      v={
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[d.priority]}`} />
                          {d.priority}
                          <span className="text-[13.5px] font-normal text-ink-3">· resposta em {b.slaLabel}</span>
                        </span>
                      }
                    />
                    <Field k="Afetados" v={d.affected} />
                  </dl>
                  {b.possibleDuplicates.length > 0 && <p className="mt-3 text-[12.5px] text-warning-text">Parecido com: {b.possibleDuplicates.join(", ")}</p>}
                </div>
                {canAct && (
                  <div className="flex items-center gap-1.5 border-t border-rule bg-desk py-2 pl-2 pr-3.5">
                    <button type="button" onClick={() => actions.send(`Confirmo o rascunho ${d.id}, pode registrar.`)} className="flex h-9 items-center gap-2 rounded-lg bg-cta pl-3.5 pr-2.5 text-[13.5px] font-semibold text-white hover:bg-cta-hover">
                      Confirmar
                      <kbd className="rounded-md bg-white/15 px-1.5 py-px font-sans text-[11.5px] font-normal text-white/80">⌘↵</kbd>
                    </button>
                    <button type="button" onClick={() => actions.prefill(`Quero ajustar o rascunho ${d.id}: `)} className="h-9 rounded-lg border border-line bg-paper px-3.5 text-[13.5px] font-medium hover:bg-desk">
                      Editar
                    </button>
                    <button type="button" onClick={() => actions.send(`Cancelar o rascunho ${d.id}.`)} className="h-9 rounded-lg px-3.5 text-[13.5px] font-medium text-ink-2 hover:bg-rule/60">
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            );
          }
          case "options":
            return active && actions ? (
              <div key={i} className="flex flex-wrap gap-1.5 pt-1">
                {b.options.map((o, j) => (
                  <button key={o} type="button" onClick={() => actions.send(o)} className="group flex items-center gap-[7px] rounded-lg border border-rule bg-paper px-3 py-[7px] text-[13.5px] font-medium hover:border-primary hover:bg-primary-soft hover:text-primary-text">
                    <span className="flex h-4 w-4 items-center justify-center rounded-md bg-desk text-[11px] text-ink-3 group-hover:bg-primary group-hover:text-white">{j + 1}</span>
                    {o}
                  </button>
                ))}
              </div>
            ) : null;
          case "articles":
            return (
              <div key={i} className="text-[12.5px] text-ink-3">
                Fonte: {b.articles.map((a) => a.title).join(" · ")}
              </div>
            );
        }
      })}
    </div>
  );
}

function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-[12.5px] text-ink-3">{k}</dt>
      <dd className="text-[14.5px] font-medium">{v}</dd>
    </div>
  );
}
