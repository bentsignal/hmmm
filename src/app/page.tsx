import { ThemeToggle } from "@/components/theme-toggle";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PromptInput from "@/features/prompt/components/prompt-input";
import { UserButton } from "@clerk/nextjs";

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen w-screen flex-1 flex-col items-center justify-center gap-4">
      <span className="text-4xl font-bold">QBE</span>
      <PromptInput />
      <ThemeToggle />
      <div className="absolute right-4 bottom-4">
        <UserButton />
      </div>
    </div>
  );
}
