import Link from "next/link";
import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";

export default async function Landing() {
  return (
    <div className="mx-4 flex flex-1 flex-col items-center justify-center gap-2">
      <Logo size={50} containerClass="my-6" />
      <span className="text-secondary-foreground text-center text-lg font-semibold">
        How can I help you today?
      </span>
      <Button asChild className="mt-2">
        <Link href="/sign-up" className="text-lg font-semibold">
          Get Started
        </Link>
      </Button>
    </div>
  );
}
