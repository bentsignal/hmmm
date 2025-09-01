import { env } from "./convex.env";

// eslint-disable-next-line
export default {
  providers: [
    {
      domain: env.CLERK_FRONTEND_API_URL,
      applicationID: "convex",
    },
  ],
};
