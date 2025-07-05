import { MutationCtx, QueryCtx } from "./_generated/server";
import { agent } from "./agent";

export const authorizeThreadAccess = async (
  ctx: QueryCtx | MutationCtx,
  threadId: string,
) => {
  const userId = await ctx.auth.getUserIdentity();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const metadata = await agent.getThreadMetadata(ctx, { threadId });
  if (!metadata) {
    throw new Error("Thread not found");
  }
  if (metadata.userId !== userId.subject) {
    throw new Error("Unauthorized");
  }
};

// const ACCESS_CODE = process.env.ACCESS_CODE;
// if (!ACCESS_CODE) {
//   throw new Error("ACCESS_CODE is not set");
// }

// export const isUserSubscribed = query({
//   args: {},
//   handler: async (ctx): Promise<boolean | null> => {
//     const userId = await ctx.auth.getUserIdentity();
//     if (!userId) {
//       return null;
//     }
//     return await subCheck(ctx, userId.subject);
//   },
// });

// export const subCheck = async (ctx: QueryCtx, userId: string) => {
//   const user = await getUserByUserId(ctx, userId);
//   if (!user) {
//     return null;
//   }
//   return user.access === true;
// };

// export const requestAccess = mutation({
//   args: {
//     code: v.string(),
//   },
//   handler: async (ctx, args) => {
//     const userId = await ctx.auth.getUserIdentity();
//     if (!userId) {
//       throw new Error("Unauthorized");
//     }
//     const user = await getUserByUserId(ctx, userId.subject);
//     if (!user) {
//       throw new Error("Unauthorized");
//     }
//     if (user.access === true) {
//       throw new Error("User already has access");
//     }
//     const { code } = args;
//     if (code.toLowerCase() !== ACCESS_CODE.toLowerCase()) {
//       throw new Error("Invalid code");
//     }
//     await ctx.db.patch(user._id, { access: true });
//   },
// });
