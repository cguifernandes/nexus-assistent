"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Employee } from "@/lib/types";
import { Avatar, NexoMark } from "./ui";

/** Sidebar + top bar do funcionário (Telas 2, 3 e Meu perfil). */
export function AppShell({ user, crumb, status, children }: { user: Employee; crumb: string; status?: React.ReactNode; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  // Analista só tem o console; funcionário tem atendimento e perfil.
  const nav =
    user.role === "analyst"
      ? [{ href: "/console", label: "Conversas", icon: <IconChat />, match: ["/console"] }]
      : [
          { href: "/chamados", label: "Atendimento", icon: <IconChat />, match: ["/chamados", "/chat"] },
          { href: "/perfil", label: "Meu perfil", icon: <IconUser />, match: ["/perfil"] },
        ];
  return (
    <div className="flex h-dvh">
      <aside className="hidden w-[232px] shrink-0 flex-col border-r border-rule px-3.5 pb-3.5 pt-5 md:flex">
        <div className="flex items-center gap-2.5 px-2">
          <NexoMark size={20} />
          <span className="text-base font-bold tracking-tight">Nexo Assist</span>
        </div>
        <nav className="mt-[22px] space-y-0.5">
          {nav.map((n) => {
            const active = n.match.some((m) => path.startsWith(m));
            return (
              <Link key={n.href} href={n.href} className={`flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] ${active ? "bg-primary-soft font-semibold text-primary-text" : "font-medium text-ink-2 hover:bg-desk"}`}>
                <span className={active ? "text-primary-text" : "text-ink-3"}>{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1" />
        <div className="flex items-center gap-2.5 border-t border-rule px-2 pb-1 pt-3.5">
          <Avatar name={user.name} />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[13.5px] font-semibold">{user.name}</div>
            <div className="truncate text-[11.5px] text-ink-3">{user.email}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth", { method: "DELETE" });
            router.push("/login");
          }}
          className="flex h-[34px] items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium text-ink-2 hover:bg-desk"
        >
          <span className="text-ink-3">
            <IconOut />
          </span>
          Sair
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-rule px-5 md:px-8">
          <span className="md:hidden">
            <NexoMark size={18} />
          </span>
          <div className="flex items-center gap-2 text-[13.5px]">
            <span className="text-ink-3">Service desk de TI</span>
            <span className="text-ink-3">›</span>
            <span className="font-semibold">{crumb}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">{status}</div>
        </header>
        {children}
      </div>
    </div>
  );
}

const svg = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
function IconChat() {
  return (
    <svg {...svg} aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg {...svg} aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}
function IconOut() {
  return (
    <svg {...svg} aria-hidden="true">
      <path d="M10 17l5-5-5-5M15 12H3M21 3v18" />
    </svg>
  );
}
