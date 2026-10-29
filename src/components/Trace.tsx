"use client";

import { useState } from "react";
import type { Trace } from "@/lib/types";
import { Check, Spinner } from "./ui";

const INTENT_LABEL: Record<string, string> = {
  duvida: "Dúvida",
  consulta_chamado: "Consulta de chamado",
  atualizar_chamado: "Atualizar chamado",
  abrir_chamado: "Abrir chamado",
  confirmacao: "Confirmação",
  falar_com_analista: "Falar com analista",
  fora_de_escopo: "Fora de escopo",
  saudacao: "Saudação",
  outro: "Outro",
};

/** "Nexo Assist ✓ consultou seus chamados ✓ …" + link para o detalhe da decisão. */
export function StatusLine({ trace, live, compact }: { trace?: Trace; live?: string[]; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const labels = unique(trace ? trace.steps.map((s) => s.label) : (live ?? []));
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
        {!compact && <span className="font-semibold text-ink">Nexo Assist</span>}
        {labels.map((l, i) => (
          <span key={l} className="inline-flex items-center gap-[5px] text-ink-3">
            {!trace && i === labels.length - 1 ? <Spinner /> : <Check />}
            {l}
          </span>
        ))}
        {trace && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="text-primary-text hover:underline">
            {open ? "Ocultar detalhes" : "Ver detalhes"}
          </button>
        )}
      </div>
      {open && trace && <TraceDetails trace={trace} />}
    </div>
  );
}

export function TraceDetails({ trace }: { trace: Trace }) {
  const d = trace.decision;
  const conf = d ? Math.round(d.confidence * 100) : undefined;
  const confColor = conf === undefined ? "" : conf >= 70 ? "bg-success" : conf >= 40 ? "bg-warning" : "bg-danger";
  return (
    <div className="mt-2 rounded-xl border border-line-card bg-paper p-3 text-[12.5px] text-ink-2 shadow-sm">
      {d ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">Entendeu:</span>
            <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-primary-text">{INTENT_LABEL[d.intent] ?? d.intent}</span>
            <span className="ml-auto flex items-center gap-1.5 text-ink-3">
              segurança
              <span className="inline-block h-1.5 w-16 overflow-hidden rounded bg-rule">
                <span className={`block h-full ${confColor}`} style={{ width: `${conf}%` }} />
              </span>
              <span className="font-medium text-ink">{conf}%</span>
            </span>
          </div>
          <div>
            <span className="font-semibold text-ink">Por quê:</span> {d.reasoning}
          </div>
          <div>
            <span className="font-semibold text-ink">Ação planejada:</span> {d.plannedAction}
          </div>
        </div>
      ) : (
        <div className="text-warning-text">O agent não registrou a decisão nesta resposta.</div>
      )}
      <ol className="mt-3 space-y-1.5 border-t border-rule pt-2">
        {trace.steps
          .filter((s) => s.tool !== "recordDecision")
          .map((s, i) => (
            <li key={i}>
              <details>
                <summary className="cursor-pointer">
                  <span className="font-medium text-ink">{s.label}</span>
                  <span className="text-ink-3">
                    {" "}
                    · <span className="font-mono">{s.tool}</span> · {s.ms} ms
                  </span>
                  {isError(s.result) && <span className="ml-1 text-danger-text">erro</span>}
                </summary>
                <div className="mt-1 grid gap-1 pl-3 font-mono text-[11px] text-ink-3 sm:grid-cols-2">
                  <pre className="overflow-auto rounded-md bg-desk p-1.5">args: {JSON.stringify(s.args, null, 1)}</pre>
                  <pre className="max-h-40 overflow-auto rounded-md bg-desk p-1.5">result: {JSON.stringify(s.result, null, 1)}</pre>
                </div>
              </details>
            </li>
          ))}
      </ol>
      <div className="mt-2 border-t border-rule pt-2 font-mono text-[11px] text-ink-3">
        {trace.model} · {(trace.durationMs / 1000).toFixed(1)} s
        {trace.usage && ` · ${trace.usage.inputTokens ?? "?"} in / ${trace.usage.outputTokens ?? "?"} out tokens`}
      </div>
    </div>
  );
}

const isError = (r: unknown): boolean => typeof r === "object" && r !== null && "error" in r;
const unique = (xs: string[]): string[] => [...new Set(xs)];
