import { MoveLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto my-8 flex max-w-[800px] flex-col gap-4 px-4 sm:my-24">
      <Link href="/" className="flex items-center gap-2">
        <MoveLeft className="h-4 w-4" />
        Return to home
      </Link>
      {children}
    </div>
  );
}
