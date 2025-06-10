// import { SignUp, SignedOut } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import SignUpComponent from "@/features/auth/components/sign-up-component";

export default async function SignUpPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/");
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      {/* <SignedOut>
        <SignUp forceRedirectUrl="/" />
      </SignedOut> */}
      <SignUpComponent />
    </div>
  );
}
