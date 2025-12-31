import { createEnv } from "convex-env";
import { v } from "convex/values";

export const env = createEnv({
  CONVEX_ENVIRONMENT: v.string(),
  EXA_API_KEY: v.string(),
  FAL_KEY: v.string(),
  GOOGLE_API_KEY: v.string(),
  OPENAI_API_KEY: v.string(),
  OPENROUTER_API_KEY: v.string(),
  NEXT_CONVEX_INTERNAL_KEY: v.string(),
  CLERK_WEBHOOK_SECRET: v.string(),
  CLERK_FRONTEND_API_URL: v.string(),
  POLAR_ORGANIZATION_TOKEN: v.string(),
  POLAR_SERVER: v.string(),
  POLAR_WEBHOOK_SECRET: v.string(),
  RESEND_API_KEY: v.string(),
  RESEND_WEBHOOK_SECRET: v.string(),
  UPLOADTHING_TOKEN: v.string(),
  UPLOADTHING_ORG_ID: v.string(),
  UPSTASH_REDIS_REST_URL: v.string(),
  UPSTASH_REDIS_REST_TOKEN: v.string(),
});
