import { useNavigate } from "@tanstack/react-router";
import { useClerk } from "@clerk/tanstack-react-start";

export function useSignOut() {
  const navigate = useNavigate();
  const clerk = useClerk();

  return async () => {
    await navigate({ to: "/signing-out" });
    await Promise.race([
      clerk.signOut(),
      new Promise<void>((resolve) => setTimeout(resolve, 2000)),
    ]);
    window.location.href = "/";
  };
}
