import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Chat } from "@/components/Chat";

export default async function ChatPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return <Chat user={user} />;
}
