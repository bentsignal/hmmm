import { createFileRoute } from "@tanstack/react-router";

import SignIn from "~/features/auth/components/sign-in";

export const Route = createFileRoute("/_auth/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
