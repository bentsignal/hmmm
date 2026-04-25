import { useState } from "react";
import { useSignIn } from "@clerk/tanstack-react-start/legacy";
import { toast } from "sonner";

import { cn } from "@acme/ui/utils";

import { GoogleIcon } from "./google-icon";

export function SignInButton({
  className,
  redirectUri,
}: {
  className?: string;
  redirectUri?: string;
}) {
  const clerkSignIn = useSignIn();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const disabled = !clerkSignIn.isLoaded || isSubmitting;

  async function handleClick() {
    if (!clerkSignIn.isLoaded) return;
    setIsSubmitting(true);
    try {
      await clerkSignIn.signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: redirectUri ?? "/",
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to start Google sign-in");
      setIsSubmitting(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        className,
        "cursor-pointer disabled:cursor-not-allowed",
        "flex h-11 w-full flex-row items-center justify-center rounded-full border disabled:opacity-50",
        "border-[#747775] bg-white",
      )}
    >
      <GoogleIcon />
      <span
        style={{ fontFamily: "var(--font-roboto)" }}
        className="font-medium text-[#1F1F1F]"
      >
        Sign in with Google
      </span>
    </button>
  );
}
