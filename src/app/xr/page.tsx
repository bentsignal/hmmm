import XRWrapper from "@/app/xr/wrapper";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function XRPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }
  return <XRWrapper />;
}
