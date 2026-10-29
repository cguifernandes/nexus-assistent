import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Chat } from "@/components/Chat";

export default async function ChatPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { c } = await searchParams;
  return <Chat key={c ?? "current"} user={user} initialId={c} />;
}
