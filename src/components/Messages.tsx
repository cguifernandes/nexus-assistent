"use client";

import type { Block, Message } from "@/lib/types";
import { Blocks, type BlockActions } from "./Blocks";
import { StatusLine } from "./Trace";
import { Spinner, fmtTime } from "./ui";

export interface Streaming {
  text: string;
  steps: string[];
  blocks: Block[];
}

/** Lista de mensagens do funcionário (Telas 2 e 3). */
export function MessageList({
  messages,
  streaming,
  actions,
  activeBlocks,
}: {
  messages: Message[];
  streaming?: Streaming | null;
  actions?: BlockActions;
  activeBlocks: boolean;
}) {
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.id;
  return (
    <div className="space-y-5">
      {messages.map((m) => (
        <Row key={m.id} m={m} active={activeBlocks && !streaming && m.id === lastAssistant} actions={actions} />
      ))}
      {streaming && (
        <div className="space-y-1.5">
          <StatusLine live={streaming.steps} />
          <div className="max-w-[600px] rounded-[4px_12px_12px_12px] border border-rule bg-paper px-4 py-3 text-[14.5px]">
            {streaming.text ? <Rich text={streaming.text} /> : <Spinner label={streaming.steps.at(-1) ?? "Pensando…"} />}
            <Blocks blocks={streaming.blocks} active={false} />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ m, active, actions }: { m: Message; active: boolean; actions?: BlockActions }) {
  if (m.role === "system") return <div className="text-center text-xs text-ink-3">{m.content}</div>;
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[520px] whitespace-pre-wrap rounded-[12px_12px_4px_12px] bg-ink px-4 py-[11px] text-[14.5px] text-white">{m.content}</div>
      </div>
    );
  }
  if (m.role === "analyst") {
    return (
      <div className="space-y-1.5">
        <div className="text-[12.5px] font-semibold text-success-text">Analista do service desk</div>
        <div className="max-w-[600px] rounded-[4px_12px_12px_12px] bg-human-bubble px-4 py-3 text-[14.5px]">
          <Rich text={m.content} />
        </div>
      </div>
    );
  }
  const hasText = m.content && m.content !== "(sem resposta)";
  const options = m.blocks?.filter((b) => b.type === "options") ?? [];
  return (
    <div className="space-y-1.5">
      <StatusLine trace={m.trace} />
      {(hasText || options.length > 0) && (
        <div className="max-w-[600px] rounded-[4px_12px_12px_12px] border border-rule bg-paper px-4 py-3 text-[14.5px]">
          {hasText ? <Rich text={m.content} /> : <p className="text-ink-3">Escolha uma opção abaixo:</p>}
          <Blocks blocks={options} active={active} actions={actions} />
        </div>
      )}
      {m.blocks && (
        <div className="max-w-[600px]">
          <Blocks blocks={m.blocks.filter((b) => b.type !== "options")} active={active} actions={actions} />
        </div>
      )}
    </div>
  );
}

/** Lista de mensagens no console do analista (Telas 4 e 5): funcionário à esquerda, agent/analista à direita. */
export function ConsoleMessageList({ messages, analystName }: { messages: Message[]; analystName?: (id?: string) => string }) {
  return (
    <div>
      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const showDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString();
        return (
          <div key={m.id}>
            {showDay && (
              <div className="flex justify-center pb-1 pt-2">
                <span className="rounded-full bg-paper/80 px-2.5 py-1 text-xs font-medium text-ink-3">{dayLabel(m.at)}</span>
              </div>
            )}
            <ConsoleRow m={m} analystName={analystName} />
          </div>
        );
      })}
    </div>
  );
}

function ConsoleRow({ m, analystName }: { m: Message; analystName?: (id?: string) => string }) {
  if (m.role === "system") {
    return (
      <div className="flex items-center gap-3 pb-1 pt-[18px]">
        <span className="h-px flex-1 bg-rule" />
        <span className="text-xs font-medium text-ink-3">
          {m.content} · {fmtTime(m.at)}
        </span>
        <span className="h-px flex-1 bg-rule" />
      </div>
    );
  }
  if (m.role === "user") {
    return (
      <div className="flex pt-4">
        <div className="max-w-[420px] rounded-[4px_12px_12px_12px] bg-paper px-3 pb-1.5 pt-2 text-[14.5px]">
          <div className="whitespace-pre-wrap">{m.content}</div>
          <div className="pt-0.5 text-right text-[11px] text-ink-3">{fmtTime(m.at)}</div>
        </div>
      </div>
    );
  }
  const human = m.role === "analyst";
  return (
    <div className="flex flex-col items-end gap-1 pt-4">
      <div className="flex items-center gap-1.5 px-1 text-xs font-semibold text-ink-2">
        {human ? (analystName?.(undefined) ?? "Analista") : "Nexo Assist"}
        <span className={`rounded-md px-1.5 py-px text-[11px] ${human ? "bg-success-soft text-success-text" : "bg-primary-soft text-primary-text"}`}>
          {human ? "Suporte" : "IA"}
        </span>
      </div>
      <div className={`max-w-[420px] rounded-[12px_4px_12px_12px] px-3 pb-1.5 pt-2 text-[14.5px] ${human ? "bg-human-bubble" : "bg-agent-bubble"}`}>
        <Rich text={m.content} />
        {m.blocks && m.blocks.length > 0 && (
          <div className="mt-1 text-[12px] text-ink-3">
            {m.blocks.map((b, i) => (
              <div key={i}>
                {b.type === "tickets" && `mostrou ${b.tickets.map((t) => t.id).join(", ")}`}
                {b.type === "draft" && `rascunho ${b.draft.id}: ${b.draft.title}${b.draft.applied ? " (registrado)" : ""}`}
                {b.type === "options" && `opções: ${b.options.join(" / ")}`}
                {b.type === "articles" && `artigos: ${b.articles.map((a) => a.title).join(", ")}`}
              </div>
            ))}
          </div>
        )}
        <div className="pt-0.5 text-right text-[11px] text-ink-3">{fmtTime(m.at)}</div>
      </div>
      {!human && m.trace && (
        <div className="px-1">
          <StatusLine trace={m.trace} compact />
        </div>
      )}
    </div>
  );
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Hoje";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

/** Markdown mínimo: parágrafos, listas, **negrito** e `código`. */
export function Rich({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="prose-chat">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*[-•*]\s+/.test(l))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-•*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
          return (
            <ol key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {inline(b)}
          </p>
        );
      })}
    </div>
  );
}

function inline(s: string): React.ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
    return part;
  });
}
