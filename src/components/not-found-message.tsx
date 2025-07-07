import Link from "next/link";
import { Button } from "./ui/button";

export default function NotFoundMessage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-2xl font-bold">Hmmmmm</span>
      <span>
        We had some trouble finding that page. If you think this is an error,
        please{" "}
        <span className="text-primary font-bold">
          <Link href="/settings/support">contact support.</Link>
        </span>
      </span>
      <Link href="/">
        <Button>Return to home</Button>
      </Link>
    </div>
  );
}
