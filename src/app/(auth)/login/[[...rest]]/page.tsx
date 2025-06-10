// import { SignedOut, SignIn } from "@clerk/nextjs";
import SignInComponent from "@/features/auth/components/sign-in-component";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Login() {
  const { userId } = await auth();

  if (userId) {
    redirect("/");
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      {/* <SignedOut>
        <SignIn forceRedirectUrl="/" />
      </SignedOut> */}
      <SignInComponent />
    </div>
  );
}
