import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Settings() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  return <p>general</p>;
}
