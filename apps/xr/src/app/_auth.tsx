import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Outlet />
    </div>
  );
}
