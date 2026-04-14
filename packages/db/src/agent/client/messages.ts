import type { ModelMessage } from "ai";
import type { PaginationOptions } from "convex/server";
import { parse } from "convex-helpers/validators";

import type {
  Message,
  MessageStatus,
  MessageWithMetadata,
} from "../validators";
import type { ActionCtx, AgentComponent, MutationCtx, QueryCtx } from "./types";
import { serializeMessage } from "../mapping";
import { toUIMessages } from "../ui/to_ui_messages";
import { vMessageWithMetadata } from "../validators";

/**
 * List messages from a thread.
 */
export async function listMessages(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  component: AgentComponent,
  {
    threadId,
    paginationOpts,
    excludeToolMessages,
    statuses,
  }: {
    threadId: string;
    paginationOpts: PaginationOptions;
    excludeToolMessages?: boolean;
    statuses?: MessageStatus[];
  },
) {
  if (paginationOpts.numItems === 0) {
    return {
      page: [],
      isDone: true,
      continueCursor: paginationOpts.cursor ?? "",
    };
  }
  return ctx.runQuery(component.messages.listMessagesByThreadId, {
    order: "desc",
    threadId,
    paginationOpts,
    excludeToolMessages,
    statuses,
  });
}

export async function listUIMessages(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  component: AgentComponent,
  args: {
    threadId: string;
    paginationOpts: PaginationOptions;
  },
) {
  const result = await listMessages(ctx, component, args);
  return { ...result, page: toUIMessages(result.page) };
}

export interface SaveMessagesArgs {
  threadId: string;
  userId?: string | null;
  promptMessageId?: string;
  messages: (ModelMessage | Message)[];
  metadata?: Omit<MessageWithMetadata, "message">[];
  failPendingSteps?: boolean;
  pendingMessageId?: string;
}

export async function saveMessages(
  ctx: MutationCtx | ActionCtx,
  component: AgentComponent,
  args: SaveMessagesArgs & {
    agentName?: string;
  },
) {
  const result = await ctx.runMutation(component.messages.addMessages, {
    threadId: args.threadId,
    userId: args.userId ?? undefined,
    agentName: args.agentName,
    promptMessageId: args.promptMessageId,
    pendingMessageId: args.pendingMessageId,
    messages: await Promise.all(
      args.messages.map(async (m, i) => {
        const { message } = await serializeMessage(ctx, component, m);
        const base = args.metadata?.[i];
        return parse(vMessageWithMetadata, {
          ...base,
          message,
        });
      }),
    ),
    failPendingSteps: args.failPendingSteps ?? false,
  });
  return { messages: result.messages };
}

export type SaveMessageArgs = {
  threadId: string;
  userId?: string | null;
  promptMessageId?: string;
  metadata?: Omit<MessageWithMetadata, "message">;
  pendingMessageId?: string;
} & (
  | {
      prompt?: undefined;
      message: ModelMessage | Message;
    }
  | {
      prompt: string;
      message?: undefined;
    }
);

export async function saveMessage(
  ctx: MutationCtx | ActionCtx,
  component: AgentComponent,
  args: SaveMessageArgs & {
    agentName?: string;
  },
) {
  const { messages } = await saveMessages(ctx, component, {
    threadId: args.threadId,
    userId: args.userId ?? undefined,
    agentName: args.agentName,
    promptMessageId: args.promptMessageId,
    pendingMessageId: args.pendingMessageId,
    messages:
      args.prompt !== undefined
        ? [{ role: "user", content: args.prompt }]
        : [args.message],
    metadata: args.metadata ? [args.metadata] : undefined,
  });
  const message = messages.at(-1);
  if (!message) {
    throw new Error("saveMessage produced no messages");
  }
  return { messageId: message._id, message };
}
