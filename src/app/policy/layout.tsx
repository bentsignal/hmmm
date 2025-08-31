import { MoveLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-h-screen max-w-[800px] flex-col gap-4 overflow-y-auto px-4 py-8 sm:py-24">
      <Link href="/" className="flex items-center gap-2">
        <MoveLeft className="h-4 w-4" />
        Return to home
      </Link>
      {children}
    </div>
  );
}
