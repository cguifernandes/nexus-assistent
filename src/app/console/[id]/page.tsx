import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { ConsoleShell } from "@/components/ConsoleShell";
import { ConsoleConversation } from "@/components/ConsoleConversation";

export default async function ConsoleConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "analyst") redirect("/chat");
  const { id } = await params;
  return (
    <ConsoleShell user={user} selectedId={id}>
      <ConsoleConversation key={id} id={id} me={user} />
    </ConsoleShell>
  );
}
