import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Billing() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  return <p>billing</p>;
}
