import { auth } from "@clerk/nextjs/server";
import { SessionClaims } from "@/features/auth/types";

export const getSessionData = async () => {
  const session = await auth();
  const metadata = session.sessionClaims?.publicMetadata as
    | SessionClaims
    | undefined;
  return {
    uid: session.userId,
    ...metadata,
  };
};

export async function getAuthToken() {
  return (await (await auth()).getToken({ template: "convex" })) ?? undefined;
}
