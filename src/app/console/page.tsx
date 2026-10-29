import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { ConsoleShell } from "@/components/ConsoleShell";

export default async function ConsolePage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "analyst") redirect("/chat");
  return (
    <ConsoleShell user={user}>
      <div className="flex h-full items-center justify-center text-sm text-slate-500">Selecione uma conversa na lista.</div>
    </ConsoleShell>
  );
}
