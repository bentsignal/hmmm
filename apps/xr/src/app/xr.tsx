import { createFileRoute, redirect } from "@tanstack/react-router";

import { XRWrapper } from "~/app/xr/-wrapper";

export const Route = createFileRoute("/xr")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isSignedIn) {
      throw redirect({ to: "/login" });
    }
  },
  component: XRPage,
});

function XRPage() {
  return (
    <div className="flex h-screen flex-1 flex-col items-center justify-center gap-4">
      <XRWrapper />
    </div>
  );
}
