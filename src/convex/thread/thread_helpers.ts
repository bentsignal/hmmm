import { ConvexError } from "convex/values";
import { ActionCtx, MutationCtx, QueryCtx } from "@/convex/_generated/server";
import { agent } from "@/convex/agents";
import { isAdmin } from "@/convex/user/user_helpers";
import { MAX_ATTACHMENTS_PER_MESSAGE } from "../library/library_config";
import { messageSendRateLimit } from "../limiter";
import { getUsageHelper } from "../sub/sub_helpers";
import {
  SystemErrorCode,
  SystemNoticeCode,
} from "@/features/messages/types/message-types";
import {
  formatError,
  formatNotice,
} from "@/features/messages/util/message-util";

/**
 * Gets thread metadata from table separate from agent component. this
 * is where all custom info related to thread state is located
 * @param ctx
 * @param threadId
 * @returns metadata relating to thread
 */
export const getThreadMetadata = async (ctx: QueryCtx, threadId: string) => {
  const metadata = await ctx.db
    .query("threadMetadata")
    .withIndex("by_thread_id", (q) => q.eq("threadId", threadId))
    .first();
  if (!metadata) {
    // metadata not found
    return null;
  }
  return metadata;
};

/**
 * verify that a user is allowed to access a thread. If they are,
 * return the thread metadata. Admin's can access any thread
 * @param ctx
 * @param threadId
 * @returns threadMetadata / null depending on whether or not access is granted
 */
export const authorizeThreadAccess = async (
  ctx: QueryCtx | MutationCtx,
  threadId: string,
) => {
  const userId = await ctx.auth.getUserIdentity();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  const [metadata, isAdminUser] = await Promise.all([
    getThreadMetadata(ctx, threadId),
    isAdmin(ctx, userId.subject),
  ]);
  if (!metadata) {
    // thread not found
    return null;
  }
  if (isAdminUser) {
    return metadata;
  }
  if (metadata.userId !== userId.subject) {
    throw new Error("Unauthorized");
  }
  return metadata;
};

/**
 * Log a user facing error to the thread
 * @param ctx
 * @param threadId
 * @param code
 * @param message
 */
export const logSystemError = async (
  ctx: ActionCtx | MutationCtx,
  threadId: string,
  code: SystemErrorCode,
  message: string,
) => {
  console.log(
    "System Error during generation. Error code:",
    code,
    "Error message:",
    message,
  );
  await agent.saveMessage(ctx, {
    threadId: threadId,
    message: {
      role: "assistant",
      content: formatError(code),
    },
  });
};

/**
 * Log a system notice to the thread
 * @param ctx
 * @param threadId
 * @param code
 */
export const logSystemNotice = async (
  ctx: ActionCtx,
  threadId: string,
  code: SystemNoticeCode,
) => {
  await agent.saveMessage(ctx, {
    threadId: threadId,
    message: {
      role: "assistant",
      content: formatNotice(code),
    },
  });
};

export const threadMessageCheck = async (
  ctx: MutationCtx,
  message: string,
  attachmentLength: number,
) => {
  if (message.length > 20000) {
    throw new ConvexError("Message is too long. Please shorten your message.");
  }
  // auth check
  const userId = await ctx.auth.getUserIdentity();
  if (!userId) {
    throw new ConvexError("Unauthorized");
  }
  // check usage and rate limiting
  const [usage] = await Promise.all([
    getUsageHelper(ctx, userId.subject),
    messageSendRateLimit(ctx, userId.subject),
  ]);
  if (usage.limitHit) {
    throw new ConvexError("User has reached usage limit");
  }
  // max 20 files per message
  if (attachmentLength > MAX_ATTACHMENTS_PER_MESSAGE) {
    throw new ConvexError("You can only attach up to 20 files per message.");
  }
  return userId;
};

export const saveNewMessage = async (
  ctx: MutationCtx,
  threadId: string,
  prompt: string,
  attachments?: string[],
) => {
  const fileNames = attachments || [];
  return await agent.saveMessages(ctx, {
    threadId: threadId,
    messages: [
      {
        role: "user",
        content: prompt,
      },
      ...fileNames.map((fileName) => ({
        role: "system" as const,
        content: `User has attached a file with the following file name: ${fileName}`,
      })),
    ],
  });
};
