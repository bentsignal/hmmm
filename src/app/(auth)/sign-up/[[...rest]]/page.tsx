import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SignUp from "@/features/auth/components/sign-up";

export default async function SignUpPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/");
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <SignUp />
    </div>
  );
}
