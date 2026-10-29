import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { ConsoleShell } from "@/components/ConsoleShell";

export default async function ConsolePage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "analyst") redirect("/chat");
  return (
    <ConsoleShell user={user}>
      <div className="flex flex-1 items-center justify-center text-[13.5px] text-ink-3">Selecione uma conversa na lista.</div>
    </ConsoleShell>
  );
}
