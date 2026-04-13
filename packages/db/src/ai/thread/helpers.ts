import type { CustomCtx } from "convex-helpers/server/customFunctions";
import { ConvexError } from "convex/values";

import type { Doc } from "../../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../../_generated/server";
import type { authedMutation, authedQuery } from "../../convex_helpers";
import { messageSendRateLimit } from "../../limiter";
import { isAdmin } from "../../user/account";
import { getUsageHelper } from "../../user/usage";
import { agent } from "../agents";

const MAX_ATTACHMENTS_PER_MESSAGE = 10;

export type SystemErrorCode = "G1" | "G2" | "G3" | "G4";
type SystemNoticeCode = "N1";
const SystemErrorLabel = "--SYSTEM_ERROR--";
const SystemNoticeLabel = "--SYSTEM_NOTICE--";

function formatError(code: SystemErrorCode) {
  return `${SystemErrorLabel}${code}`;
}

function formatNotice(code: SystemNoticeCode) {
  return `${SystemNoticeLabel}${code}`;
}

export async function getMetadata(ctx: QueryCtx, threadId: string) {
  const metadata = await ctx.db
    .query("threadMetadata")
    .withIndex("by_thread_id", (q) => q.eq("threadId", threadId))
    .first();
  if (!metadata) {
    return null;
  }
  return metadata;
}

export async function authorizeAccess(
  ctx: CustomCtx<typeof authedMutation> | CustomCtx<typeof authedQuery>,
  threadId: string,
) {
  const [metadata, isAdminUser] = await Promise.all([
    getMetadata(ctx, threadId),
    isAdmin(ctx, ctx.user.subject),
  ]);
  if (!metadata) {
    return null;
  }
  if (isAdminUser) {
    return metadata;
  }
  if (metadata.userId !== ctx.user.subject) {
    throw new Error("Unauthorized");
  }
  return metadata;
}

export async function logSystemError(
  ctx: ActionCtx | MutationCtx,
  threadId: string,
  code: SystemErrorCode,
  message: string,
) {
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
}

export async function logSystemNotice(
  ctx: ActionCtx,
  threadId: string,
  code: SystemNoticeCode,
) {
  await agent.saveMessage(ctx, {
    threadId: threadId,
    message: {
      role: "assistant",
      content: formatNotice(code),
    },
  });
}

export async function validateMessage(
  ctx: CustomCtx<typeof authedMutation>,
  message: string,
  attachmentLength: number,
) {
  if (message.length > 20000) {
    throw new ConvexError("Message is too long. Please shorten your message.");
  }
  if (attachmentLength > MAX_ATTACHMENTS_PER_MESSAGE) {
    throw new ConvexError("You can only attach up to 20 files per message.");
  }
  const [usage] = await Promise.all([
    getUsageHelper(ctx),
    messageSendRateLimit(ctx),
  ]);
  if (usage.limitHit) {
    throw new ConvexError("User has reached usage limit");
  }
}

interface Attachment {
  key: string;
  name: string;
  mimeType: string;
}

interface SaveUserMessageArgs {
  ctx: CustomCtx<typeof authedMutation>;
  threadId: string;
  prompt: string;
  userInfo: Doc<"personalInfo"> | null;
  attachments?: Attachment[];
}

function buildUserProfileParts(userInfo: Doc<"personalInfo">) {
  if (
    !userInfo.name &&
    !userInfo.location &&
    !userInfo.language &&
    !userInfo.notes
  ) {
    return [];
  }
  const fields = [
    userInfo.name ? `The user's name is ${userInfo.name}` : null,
    userInfo.location
      ? `The user's current location is ${userInfo.location}`
      : null,
    userInfo.language
      ? `User would like your response to be in: ${userInfo.language}`
      : null,
    userInfo.notes
      ? `Additional info user would like you to know: ${userInfo.notes}`
      : null,
  ].filter((f): f is string => f !== null);
  if (fields.length === 0) {
    return [];
  }
  return [
    {
      role: "system" as const,
      content: `User profile — ${fields.join("; ")}`,
    },
  ];
}

function buildAttachmentMessages(attachments: Attachment[] | undefined) {
  if (!attachments) {
    return [];
  }
  return attachments.map((attachment) => ({
    role: "system" as const,
    content: `User has attached a file - file name: <${attachment.name}>, mimeType: <${attachment.mimeType}>, file key: <${attachment.key}>`,
  }));
}

export async function saveUserMessage({
  ctx,
  threadId,
  prompt,
  userInfo,
  attachments,
}: SaveUserMessageArgs) {
  const systemParts = userInfo ? buildUserProfileParts(userInfo) : [];
  const attachmentParts = buildAttachmentMessages(attachments);
  const { messages } = await agent.saveMessages(ctx, {
    threadId: threadId,
    messages: [
      ...systemParts,
      { role: "user", content: prompt },
      ...attachmentParts,
    ],
  });
  const lastMessage = messages.at(-1);
  if (!lastMessage) {
    throw new ConvexError("Failed to save message");
  }
  const results = await Promise.all(
    attachments?.map((attachment) =>
      ctx.db
        .query("files")
        .withIndex("by_key", (q) => q.eq("key", attachment.key))
        .first(),
    ) ?? [],
  );
  const files = results.filter((file) => file !== null);
  const lastPromptMessage = messages.find(
    (message) => message.message?.content === prompt,
  );
  if (!lastPromptMessage) {
    throw new ConvexError("Failed to save message");
  }
  await ctx.db.insert("messageMetadata", {
    messageId: lastPromptMessage._id,
    threadId: threadId,
    userId: ctx.user.subject,
    attachments: files.map((file) => file._id),
  });
  return { lastMessageId: lastMessage._id };
}

export async function saveNewTitle({
  ctx,
  threadId,
  title,
}: {
  ctx: MutationCtx | CustomCtx<typeof authedMutation>;
  threadId: string;
  title: string;
}) {
  const metadata = await getMetadata(ctx, threadId);
  if (!metadata) {
    throw new ConvexError("Thread not found");
  }
  if ("user" in ctx && metadata.userId !== ctx.user.subject) {
    throw new Error("Unauthorized");
  }
  await ctx.db.patch(metadata._id, {
    title: title,
  });
  await agent.updateThreadMetadata(ctx, {
    threadId: threadId,
    patch: {
      title: title,
    },
  });
}
