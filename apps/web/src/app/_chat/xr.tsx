import { createFileRoute } from "@tanstack/react-router";

import XRWrapper from "~/app/xr/-wrapper";

export const Route = createFileRoute("/_chat/xr")({
  component: XRPage,
});

function XRPage() {
  return (
    <div className="flex h-screen flex-1 flex-col items-center justify-center gap-4">
      <XRWrapper />
    </div>
  );
}
