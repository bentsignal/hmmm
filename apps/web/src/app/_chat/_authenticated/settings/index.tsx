import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_chat/_authenticated/settings/")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/preferences" });
  },
});
