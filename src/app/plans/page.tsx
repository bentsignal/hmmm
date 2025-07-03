import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Plans() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
      <span className="text-xl font-bold">Plans</span>
      <span className="text-muted-foreground">
        Choose a plan to get started.
      </span>
    </div>
  );
}
