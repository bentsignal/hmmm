import { MoveLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 max-w-[800px] mx-auto px-4 my-8 sm:my-24">
      <Link href="/" className="flex items-center gap-2">
        <MoveLeft className="h-4 w-4" />
        Return to home
      </Link>
      {children}
    </div>
  );
}
