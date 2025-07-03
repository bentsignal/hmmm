import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Success() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col gap-4">
      <span className="text-xl font-bold">Success</span>
      <span className="text-muted-foreground">
        Welcome to QBE Premium!
        <br />
        <Link href="/">Get started</Link>
      </span>
    </div>
  );
}
