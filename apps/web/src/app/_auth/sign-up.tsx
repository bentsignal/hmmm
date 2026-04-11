import { createFileRoute } from "@tanstack/react-router";

import SignUp from "~/features/auth/components/sign-up";

export const Route = createFileRoute("/_auth/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <SignUp />
    </div>
  );
}
