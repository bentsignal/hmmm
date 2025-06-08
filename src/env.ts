import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    SECRET_KEY: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_BASE_URL: z.string().min(1),
  },
  runtimeEnv: {
    SECRET_KEY: process.env.SECRET_KEY,
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  },
});
