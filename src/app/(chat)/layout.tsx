import { ThemeToggle } from "@/components/theme-toggle";
import Composer from "@/features/composer/components";
import { UserButton } from "@clerk/nextjs";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen flex-1 flex-col items-center justify-center gap-4">
      {children}
      <Composer />
      <ThemeToggle />
      <div className="absolute top-4 left-4">
        <UserButton />
      </div>
    </div>
  );
}
