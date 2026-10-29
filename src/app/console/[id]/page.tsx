import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { ConsoleConversation } from "@/components/ConsoleConversation";

export default async function ConsoleConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  return <ConsoleConversation key={id} id={id} me={user} />;
}
