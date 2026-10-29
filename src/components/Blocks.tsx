"use client";

import type { Block, TicketView } from "@/lib/types";
import { Badge, PriorityBadge, TicketStatusBadge, fmtDate } from "./ui";

export function TicketCard({ ticket: t, onSelect }: { ticket: TicketView; onSelect?: (t: TicketView) => void }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono text-xs text-slate-500">{t.id}</div>
          <div className="font-medium leading-snug">{t.title}</div>
        </div>
        <TicketStatusBadge status={t.status} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
        <Badge className="bg-slate-100 text-slate-700">{t.type === "INC" ? "Incidente" : "Requisição"}</Badge>
        <Badge className="bg-slate-100 text-slate-700">{t.category}</Badge>
        <PriorityBadge priority={t.priority} />
        <span className="ml-auto">atualizado {fmtDate(t.updatedAt)}</span>
      </div>
      {t.open && (
        <div className={`mt-2 text-xs ${t.overdue ? "text-red-700 font-medium" : "text-slate-600"}`}>
          {t.overdue ? `Prazo vencido (era até ${fmtDate(t.dueAt)})` : `Prazo: até ${fmtDate(t.dueAt)} · ${t.slaLabel}`}
        </div>
      )}
      {t.reopenable && <div className="mt-2 text-xs text-emerald-700">Resolvido recentemente · pode ser reaberto</div>}
    </>
  );
  const cls = "block w-full text-left rounded-xl border bg-white p-3 shadow-sm";
  return onSelect ? (
    <button type="button" onClick={() => onSelect(t)} className={`${cls} border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50`}>
      {body}
    </button>
  ) : (
    <div className={`${cls} border-slate-200`}>{body}</div>
  );
}

export interface BlockActions {
  send: (text: string) => void;
  prefill: (text: string) => void;
}

/** Renderiza os blocos de uma resposta. `active` habilita botões (só na última resposta). */
export function Blocks({ blocks, active, actions }: { blocks: Block[]; active: boolean; actions?: BlockActions }) {
  if (!blocks.length) return null;
  return (
    <div className="mt-2 space-y-2">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "tickets":
            return (
              <div key={i} className="space-y-2">
                {b.tickets.map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    onSelect={b.selectable && active && actions ? (x) => actions.send(`Quero falar sobre o chamado ${x.id}.`) : undefined}
                  />
                ))}
              </div>
            );
          case "draft":
            return (
              <div key={i} className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                    {b.draft.mode === "create" ? "Rascunho do chamado" : b.draft.mode === "update" ? `Complemento ao ${b.draft.ticketId}` : `Reabertura do ${b.draft.ticketId}`}
                  </span>
                  {b.draft.applied && <Badge className="bg-emerald-100 text-emerald-800">registrado</Badge>}
                </div>
                <div className="mt-2 font-medium">{b.draft.title}</div>
                <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{b.draft.description}</p>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                  <Field k="Tipo" v={b.draft.type === "INC" ? "Incidente (INC)" : "Requisição (REQ)"} />
                  <Field k="Categoria" v={b.draft.category} />
                  <Field k="Prioridade" v={<PriorityBadge priority={b.draft.priority} />} />
                  <Field k="Prazo" v={b.slaLabel} />
                  <Field k="Afetado" v={b.draft.affected} />
                </dl>
                {b.possibleDuplicates.length > 0 && (
                  <p className="mt-2 text-xs text-amber-800">Parecido com: {b.possibleDuplicates.join(", ")}</p>
                )}
                {active && !b.draft.applied && actions && (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => actions.send(`Confirmo o rascunho ${b.draft.id}, pode registrar.`)}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => actions.prefill(`Quero ajustar o rascunho ${b.draft.id}: `)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                    >
                      Ajustar
                    </button>
                  </div>
                )}
              </div>
            );
          case "options":
            return active && actions ? (
              <div key={i} className="flex flex-wrap gap-2">
                {b.options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => actions.send(o)}
                    className="rounded-full border border-indigo-300 bg-white px-3 py-1 text-sm text-indigo-700 hover:bg-indigo-50"
                  >
                    {o}
                  </button>
                ))}
              </div>
            ) : null;
          case "articles":
            return (
              <div key={i} className="text-xs text-slate-500">
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
    <div>
      <dt className="text-slate-500">{k}</dt>
      <dd className="font-medium text-slate-800">{v}</dd>
    </div>
  );
}
