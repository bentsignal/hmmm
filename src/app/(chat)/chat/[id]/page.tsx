import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  return <div>Chat {id}</div>;
}
