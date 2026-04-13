import { SignUp as ClerkSignUp } from "@clerk/tanstack-react-start";

export function SignUp() {
  return (
    <div className="grid w-full grow items-center px-4 sm:justify-center">
      <ClerkSignUp />
    </div>
  );
}
