import { SignIn as ClerkSignIn } from "@clerk/tanstack-react-start";

export function SignIn() {
  return (
    <div className="grid w-full grow items-center px-4 sm:justify-center">
      <ClerkSignIn />
    </div>
  );
}
