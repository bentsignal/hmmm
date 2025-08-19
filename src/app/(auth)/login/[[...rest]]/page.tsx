import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SignIn from "@/features/auth/components/sign-in";

export default async function Login() {
  const { userId } = await auth();

  if (userId) {
    redirect("/");
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <SignIn />
    </div>
  );
}
