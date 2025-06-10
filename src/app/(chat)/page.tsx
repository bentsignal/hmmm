import { Button } from "@/components/ui/button";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();
  return (
    <>
      <span>Welcome to QBE</span>
      {!userId && (
        <Button asChild>
          <Link href="/login">Login</Link>
        </Button>
      )}
    </>
  );
}
