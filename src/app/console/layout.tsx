import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { ConsoleShell } from "@/components/ConsoleShell";

/** O shell (rail + lista) vive no layout: persiste ao trocar de conversa, sem recarregar a lista. */
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "analyst") redirect("/chat");
  return <ConsoleShell user={user}>{children}</ConsoleShell>;
}
