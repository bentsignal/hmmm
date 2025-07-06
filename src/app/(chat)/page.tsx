import { auth } from "@clerk/nextjs/server";
import Landing from "./landing";
import Home from "./home";

export default async function Chat() {
  const { userId } = await auth();

  if (userId) {
    return <Home />;
  }

  return <Landing />;
}
