import { ConvexHttpClient } from "convex/browser";

import { env } from "~/env";

let client: ConvexHttpClient | null = null;

export function getConvexHttpClient(): ConvexHttpClient {
  if (!client) {
    client = new ConvexHttpClient(env.VITE_CONVEX_URL);
  }
  return client;
}

export async function getAuthenticatedConvexClient(
  token: string | undefined,
): Promise<ConvexHttpClient> {
  const client = getConvexHttpClient();
  if (token) {
    client.setAuth(token);
  }
  return client;
}
