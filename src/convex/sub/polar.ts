import { Polar } from "@convex-dev/polar";
import { api, components } from "@/convex/_generated/api";

export const polar = new Polar(components.polar, {
  getUserInfo: async (ctx): Promise<{ userId: string; email: string }> => {
    const user = await ctx.runQuery(api.user.user_queries.getUserIdentity);
    if (!user) {
      throw new Error("User not found");
    }
    return {
      userId: user.subject,
      email: user.email || "",
    };
  },
});
