const vars = [
  "CONVEX_ENVIRONMENT", // development or production
  // ai
  "EXA_API_KEY",
  "FAL_KEY",
  "GOOGLE_API_KEY",
  "OPENAI_API_KEY",
  "OPENROUTER_API_KEY",
  // used to validate internal requests between vercel and convex
  "NEXT_CONVEX_INTERNAL_KEY",
  // clerk - auth
  "CLERK_WEBHOOK_SECRET",
  "CLERK_FRONTEND_API_URL",
  // polar - subscriptions
  "POLAR_ORGANIZATION_TOKEN",
  "POLAR_SERVER", // production or sandbox
  "POLAR_WEBHOOK_SECRET",
  // resend - email
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  // uploadthing - files
  "UPLOADTHING_TOKEN",
  "UPLOADTHING_ORG_ID",
  // upstash - redis
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

type VarName = (typeof vars)[number];

export const env: Record<VarName, string> = vars.reduce(
  (acc, name) => {
    const value = process.env[name];
    if (value === undefined) {
      console.error("Missing environment variable:", name);
      throw new Error("Missing environment variable: " + name);
    }
    acc[name] = value;
    return acc;
  },
  {} as Record<VarName, string>,
);
