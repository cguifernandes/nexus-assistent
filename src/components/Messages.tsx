"use client";

import type { Block, Message } from "@/lib/types";
import { Blocks, type BlockActions } from "./Blocks";
import { TraceChips } from "./Trace";
import { Spinner } from "./ui";

export interface Streaming {
  text: string;
  steps: string[];
  blocks: Block[];
}

export function MessageList({
  messages,
  streaming,
  actions,
  activeBlocks,
}: {
  messages: Message[];
  streaming?: Streaming | null;
  actions?: BlockActions;
  /** Se os blocos da última resposta do agent devem estar interativos. */
  activeBlocks: boolean;
}) {
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.id;
  return (
    <div className="space-y-4">
      {messages.map((m) => (
        <MessageRow key={m.id} m={m} active={activeBlocks && !streaming && m.id === lastAssistant} actions={actions} />
      ))}
      {streaming && (
        <div className="flex gap-3">
          <Avatar />
          <div className="max-w-[85%]">
            <TraceChips live={streaming.steps} />
            <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm">
              {streaming.text ? <Rich text={streaming.text} /> : <Spinner label={streaming.steps.at(-1) ?? "pensando…"} />}
              <Blocks blocks={streaming.blocks} active={false} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageRow({ m, active, actions }: { m: Message; active: boolean; actions?: BlockActions }) {
  if (m.role === "system") {
    return <div className="text-center text-xs text-slate-500">{m.content}</div>;
  }
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-sm text-white whitespace-pre-wrap">{m.content}</div>
      </div>
    );
  }
  const analyst = m.role === "analyst";
  return (
    <div className="flex gap-3">
      <Avatar analyst={analyst} />
      <div className="max-w-[85%] min-w-0">
        {analyst ? <div className="mb-1 text-xs text-emerald-700 font-medium">Analista</div> : <TraceChips trace={m.trace} />}
        <div
          className={`rounded-2xl rounded-tl-sm border px-4 py-2.5 text-sm shadow-sm ${
            analyst ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
          }`}
        >
          <Rich text={m.content} />
          {m.blocks && <Blocks blocks={m.blocks} active={active} actions={actions} />}
        </div>
      </div>
    </div>
  );
}

function Avatar({ analyst }: { analyst?: boolean }) {
  return (
    <span
      className={`mt-5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${
        analyst ? "bg-emerald-600" : "bg-indigo-600"
      }`}
    >
      {analyst ? "A" : "N"}
    </span>
  );
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
