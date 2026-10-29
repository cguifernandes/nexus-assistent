"use client";

import { useState } from "react";
import type { Trace } from "@/lib/types";

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

/** Chips acima da resposta ("consultou seus chamados") + detalhe expansível da decisão. */
export function TraceChips({ trace, live }: { trace?: Trace; live?: string[] }) {
  const [open, setOpen] = useState(false);
  const labels = trace ? unique(trace.steps.map((s) => s.label)) : unique(live ?? []);
  if (!labels.length && !trace) return null;
  return (
    <div className="mb-1">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {labels.map((l) => (
          <span key={l} className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
            {l}
          </span>
        ))}
        {trace && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="text-indigo-600 hover:underline">
            {open ? "ocultar detalhes" : "ver detalhes"}
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
  const confColor = conf === undefined ? "" : conf >= 70 ? "bg-emerald-500" : conf >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-sm">
      {d ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">Entendeu:</span>
            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700">{INTENT_LABEL[d.intent] ?? d.intent}</span>
            <span className="ml-auto flex items-center gap-1.5">
              segurança
              <span className="inline-block h-1.5 w-16 overflow-hidden rounded bg-slate-200">
                <span className={`block h-full ${confColor}`} style={{ width: `${conf}%` }} />
              </span>
              <span className="font-medium">{conf}%</span>
            </span>
          </div>
          <div>
            <span className="font-semibold text-slate-900">Por quê:</span> {d.reasoning}
          </div>
          <div>
            <span className="font-semibold text-slate-900">Ação planejada:</span> {d.plannedAction}
          </div>
        </div>
      ) : (
        <div className="text-amber-700">O agent não registrou a decisão nesta resposta.</div>
      )}
      <ol className="mt-3 space-y-1.5 border-t pt-2">
        {trace.steps
          .filter((s) => s.tool !== "recordDecision")
          .map((s, i) => (
            <li key={i}>
              <details>
                <summary className="cursor-pointer">
                  <span className="font-medium">{s.label}</span>
                  <span className="text-slate-400"> · {s.tool} · {s.ms} ms</span>
                  {isError(s.result) && <span className="ml-1 text-red-600">erro</span>}
                </summary>
                <div className="mt-1 grid gap-1 pl-3 font-mono text-[11px] text-slate-600 sm:grid-cols-2">
                  <pre className="overflow-auto rounded bg-slate-50 p-1.5">args: {JSON.stringify(s.args, null, 1)}</pre>
                  <pre className="max-h-40 overflow-auto rounded bg-slate-50 p-1.5">result: {JSON.stringify(s.result, null, 1)}</pre>
                </div>
              </details>
            </li>
          ))}
      </ol>
      <div className="mt-2 border-t pt-2 text-slate-400">
        {trace.model} · {(trace.durationMs / 1000).toFixed(1)} s
        {trace.usage && ` · ${trace.usage.inputTokens ?? "?"} tokens de entrada / ${trace.usage.outputTokens ?? "?"} de saída`}
      </div>
    </div>
  );
}

const isError = (r: unknown): boolean => typeof r === "object" && r !== null && "error" in r;
const unique = (xs: string[]): string[] => [...new Set(xs)];
