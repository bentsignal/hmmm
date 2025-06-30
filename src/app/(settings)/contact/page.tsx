import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Contact() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  return <p>contact</p>;
}
