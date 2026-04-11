import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { MoveLeft } from "lucide-react";

export const Route = createFileRoute("/policy")({
  component: PolicyLayout,
});

function PolicyLayout() {
  return (
    <div className="mx-auto flex max-h-screen max-w-[800px] flex-col gap-4 overflow-y-auto px-4 py-8 sm:py-24">
      <Link to="/" className="flex items-center gap-2">
        <MoveLeft className="h-4 w-4" />
        Return to home
      </Link>
      <Outlet />
    </div>
  );
}
