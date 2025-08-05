// import { SignUp, SignedOut } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
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
