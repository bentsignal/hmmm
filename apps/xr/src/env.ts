import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const runtimeEnv =
  typeof window === "undefined"
    ? ((
        globalThis as {
          process?: { env?: Record<string, string | undefined> };
        }
      ).process?.env ?? import.meta.env)
    : import.meta.env;

export const env = createEnv({
  clientPrefix: "VITE_",
  server: {
    // clerk
    CLERK_SECRET_KEY: z.string().min(1),
    // convex
    CONVEX_DEPLOYMENT: z.string().min(1),
    CONVEX_INTERNAL_KEY: z.string().min(1),
    // openrouter
    OPENROUTER_API_KEY: z.string().min(1),
    // openai
    OPENAI_API_KEY: z.string().min(1),
  },
  client: {
    VITE_BASE_URL: z.string().min(1),
    // clerk
    VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    VITE_CLERK_SIGN_IN_URL: z.string().min(1),
    VITE_CLERK_SIGN_UP_URL: z.string().min(1),
    VITE_CLERK_FRONTEND_API_URL: z.string().min(1),
    // convex
    VITE_CONVEX_URL: z.string().min(1),
  },
  runtimeEnv,
  emptyStringAsUndefined: true,
});
