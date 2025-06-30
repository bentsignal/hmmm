import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Usage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  return <p>usage</p>;
}
