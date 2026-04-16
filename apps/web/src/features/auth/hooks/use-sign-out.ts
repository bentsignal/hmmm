import { useClerk } from "@clerk/tanstack-react-start";

export function useSignOut() {
  const clerk = useClerk();

  return async () => {
    await clerk.signOut();
    window.location.href = "/";
  };
}
