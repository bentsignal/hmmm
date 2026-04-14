import type { ObjectType } from "convex/values";
import { assert, omit, pick } from "convex-helpers";
import { mergedStream, stream } from "convex-helpers/server/stream";
import { partial } from "convex-helpers/validators";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { MessageDoc } from "./validators";
import { internalMutation, internalQuery } from "../_generated/server";
import schema from "../schema";
import { DEFAULT_RECENT_MESSAGES, extractText, isTool } from "./shared";
import { finishHandler, getStreamingMessagesWithMetadata } from "./streams";
import {
  vMessageDoc,
  vMessageStatus,
  vMessageWithMetadata,
  vPaginationResult,
} from "./validators";

function publicMessage(message: Doc<"messages">): MessageDoc {
  return message as unknown as MessageDoc;
}

export async function deleteMessage(
  ctx: MutationCtx,
  messageDoc: Doc<"messages">,
) {
  await ctx.db.delete(messageDoc._id);
}

export const deleteByIds = internalMutation({
  args: { messageIds: v.array(v.id("messages")) },
  returns: v.array(v.id("messages")),
  handler: async (ctx, args) => {
    const deletedMessageIds = await Promise.all(
      args.messageIds.map(async (id) => {
        const message = await ctx.db.get(id);
        if (message) {
          await deleteMessage(ctx, message);
          return id;
        }
        return null;
      }),
    );
    return deletedMessageIds.filter((id) => id !== null);
  },
});

export const messageStatuses = vMessageDoc.fields.status.members.map(
  (m) => m.value,
);

export const deleteByOrder = internalMutation({
  args: {
    threadId: v.id("threads"),
    startOrder: v.number(),
    startStepOrder: v.optional(v.number()),
    endOrder: v.number(),
    endStepOrder: v.optional(v.number()),
  },
  returns: v.object({
    isDone: v.boolean(),
    lastOrder: v.optional(v.number()),
    lastStepOrder: v.optional(v.number()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    isDone: boolean;
    lastOrder?: number;
    lastStepOrder?: number;
  }> => {
    const messages = await orderedMessagesStream(ctx, {
      threadId: args.threadId,
      sortOrder: "asc",
      startOrder: args.startOrder,
      startOrderBound: "gte",
    })
      .narrow({
        lowerBound: args.startStepOrder
          ? [args.startOrder, args.startStepOrder]
          : [args.startOrder],
        lowerBoundInclusive: true,
        upperBound: args.endStepOrder
          ? [args.endOrder, args.endStepOrder]
          : [args.endOrder],
        upperBoundInclusive: false,
      })
      .take(64);
    await Promise.all(messages.map((m) => deleteMessage(ctx, m)));
    return {
      isDone: messages.length < 64,
      lastOrder: messages.at(-1)?.order,
      lastStepOrder: messages.at(-1)?.stepOrder,
    };
  },
});

const addMessagesArgs = {
  userId: v.optional(v.string()),
  threadId: v.id("threads"),
  promptMessageId: v.optional(v.id("messages")),
  agentName: v.optional(v.string()),
  messages: v.array(vMessageWithMetadata),
  failPendingSteps: v.optional(v.boolean()),
  pendingMessageId: v.optional(v.id("messages")),
  hideFromUserIdSearch: v.optional(v.boolean()),
  finishStreamId: v.optional(v.id("streamingMessages")),
};

export const addMessages = internalMutation({
  args: addMessagesArgs,
  handler: addMessagesHandler,
  returns: v.object({ messages: v.array(vMessageDoc) }),
});

async function addMessagesHandler(
  ctx: MutationCtx,
  args: ObjectType<typeof addMessagesArgs>,
) {
  let userId = args.userId;
  const threadId = args.threadId;
  if (!userId && args.threadId) {
    const thread = await ctx.db.get(args.threadId);
    assert(thread, `Thread ${args.threadId} not found`);
    userId = thread.userId;
  }
  const {
    failPendingSteps,
    finishStreamId,
    messages,
    promptMessageId,
    pendingMessageId,
    hideFromUserIdSearch,
    ...rest
  } = args;
  const promptMessage = promptMessageId && (await ctx.db.get(promptMessageId));
  if (failPendingSteps) {
    assert(args.threadId, "threadId is required to fail pending steps");
    const pendingMessages = await ctx.db
      .query("messages")
      .withIndex("threadId_status_tool_order_stepOrder", (q) =>
        q.eq("threadId", threadId).eq("status", "pending"),
      )
      .order("desc")
      .take(100);
    await Promise.all(
      pendingMessages
        .filter((m) => !promptMessage || m.order === promptMessage.order)
        .filter((m) => !pendingMessageId || m._id !== pendingMessageId)
        .map(async (m) => {
          await ctx.db.patch(m._id, {
            status: "failed",
            error: "Restarting",
          });
        }),
    );
  }
  let order, stepOrder;
  let fail = false;
  let error: string | undefined;
  if (promptMessageId) {
    assert(promptMessage, `Parent message ${promptMessageId} not found`);
    if (promptMessage.status === "failed") {
      fail = true;
      error = promptMessage.error ?? error ?? "The prompt message failed";
    }
    order = promptMessage.order;
    const maxMessage = await getMaxMessage(ctx, threadId, order);
    stepOrder = maxMessage?.stepOrder ?? promptMessage.stepOrder;
  } else {
    const maxMessage = await getMaxMessage(ctx, threadId);
    order = maxMessage?.order ?? -1;
    stepOrder = maxMessage?.stepOrder ?? -1;
  }
  const toReturn: Doc<"messages">[] = [];
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]!;
    const messageDoc = {
      ...rest,
      ...message,
      userId,
      tool: isTool(message.message),
      text: hideFromUserIdSearch ? undefined : extractText(message.message),
      status: fail ? "failed" : (message.status ?? "success"),
      error: fail ? error : message.error,
    } satisfies Omit<
      Doc<"messages">,
      "_id" | "_creationTime" | "order" | "stepOrder"
    >;
    if (i === 0 && pendingMessageId) {
      const pendingMessage = await ctx.db.get(pendingMessageId);
      assert(pendingMessage, `Pending msg ${pendingMessageId} not found`);
      if (pendingMessage.status === "failed") {
        fail = true;
        error =
          `Trying to update a message that failed: ${pendingMessageId}, ` +
          `error: ${pendingMessage.error ?? error}`;
        messageDoc.status = "failed";
        messageDoc.error = error;
      }
      await ctx.db.replace(pendingMessage._id, {
        ...messageDoc,
        order: pendingMessage.order,
        stepOrder: pendingMessage.stepOrder,
      });
      const replaced = await ctx.db.get(pendingMessage._id);
      assert(replaced, "Replaced message vanished");
      toReturn.push(replaced);
      continue;
    }
    if (message.message.role === "user") {
      if (promptMessage && promptMessage.order === order) {
        const maxMessage = await getMaxMessage(ctx, threadId);
        order = (maxMessage?.order ?? order) + 1;
      } else {
        order++;
      }
      stepOrder = 0;
    } else {
      if (order < 0) {
        order = 0;
      }
      stepOrder++;
    }
    const messageId = await ctx.db.insert("messages", {
      ...messageDoc,
      order,
      stepOrder,
    });
    const inserted = await ctx.db.get(messageId);
    assert(inserted, "Just-inserted message vanished");
    toReturn.push(inserted);
  }
  // Atomically finish the stream if requested.
  if (finishStreamId) {
    await finishHandler(ctx, { streamId: finishStreamId });
  }
  return { messages: toReturn.map(publicMessage) };
}

export async function getMaxMessage(
  ctx: QueryCtx,
  threadId: Id<"threads">,
  order?: number,
) {
  return orderedMessagesStream(ctx, {
    threadId,
    sortOrder: "desc",
    startOrder: order,
    startOrderBound: "eq",
  }).first();
}

function orderedMessagesStream(
  ctx: QueryCtx,
  args: {
    threadId: Id<"threads">;
    sortOrder: "asc" | "desc";
    startOrder?: number;
    startOrderBound?: "gte" | "eq";
  },
) {
  return mergedStream(
    [true, false].flatMap((tool) =>
      messageStatuses.map((status) =>
        stream(ctx.db, schema)
          .query("messages")
          .withIndex("threadId_status_tool_order_stepOrder", (q) => {
            const qq = q
              .eq("threadId", args.threadId)
              .eq("status", status)
              .eq("tool", tool);
            if (args.startOrder !== undefined) {
              if (args.startOrderBound === "gte") {
                return qq.gte("order", args.startOrder);
              } else {
                return qq.eq("order", args.startOrder);
              }
            }
            return qq;
          })
          .order(args.sortOrder),
      ),
    ),
    ["order", "stepOrder"],
  );
}

export const finalizeMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    result: v.union(
      v.object({ status: v.literal("success") }),
      v.object({ status: v.literal("failed"), error: v.string() }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { messageId, result }) => {
    const message = await ctx.db.get(messageId);
    assert(message, `Message ${messageId} not found`);
    if (message.status !== "pending") {
      console.debug(
        "Trying to finalize a message that's already",
        message.status,
      );
      return;
    }
    if (!message.message?.content.length) {
      const messages = await getStreamingMessagesWithMetadata(
        ctx,
        message,
        result,
      );
      if (messages.length > 0) {
        await addMessagesHandler(ctx, {
          messages,
          threadId: message.threadId,
          agentName: message.agentName,
          failPendingSteps: false,
          pendingMessageId: messageId,
          userId: message.userId,
        });
        return;
      }
    }
    if (result.status === "failed") {
      await ctx.db.patch(messageId, {
        status: "failed",
        error: result.error,
      });
    } else {
      await ctx.db.patch(messageId, { status: "success" });
    }
  },
});

export const updateMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    patch: v.object(
      partial(
        pick(schema.tables.messages.validator.fields, [
          "message",
          "status",
          "error",
          "model",
          "provider",
          "providerOptions",
          "finishReason",
        ]),
      ),
    ),
  },
  returns: vMessageDoc,
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    assert(message, `Message ${args.messageId} not found`);

    const patch: Partial<Doc<"messages">> = { ...args.patch };

    if (args.patch.message !== undefined) {
      patch.message = args.patch.message;
      patch.tool = isTool(args.patch.message);
      patch.text = extractText(args.patch.message);
    }

    await ctx.db.patch(args.messageId, patch);
    const updated = await ctx.db.get(args.messageId);
    assert(updated, "Updated message vanished");
    return publicMessage(updated);
  },
});

export const listMessagesByThreadIdArgs = {
  threadId: v.id("threads"),
  excludeToolMessages: v.optional(v.boolean()),
  /** What order to sort the messages in. To get the latest, use "desc". */
  order: v.union(v.literal("asc"), v.literal("desc")),
  paginationOpts: v.optional(paginationOptsValidator),
  statuses: v.optional(v.array(vMessageStatus)),
  upToAndIncludingMessageId: v.optional(v.id("messages")),
};

export const listMessagesByThreadId = internalQuery({
  args: listMessagesByThreadIdArgs,
  handler: async (ctx, args) => {
    const messages = await listMessagesByThreadIdHandler(ctx, args);
    return { ...messages, page: messages.page.map(publicMessage) };
  },
  returns: vPaginationResult(vMessageDoc),
});

export async function listMessagesByThreadIdHandler(
  ctx: QueryCtx,
  args: ObjectType<typeof listMessagesByThreadIdArgs>,
) {
  const statuses = args.statuses ?? vMessageStatus.members.map((m) => m.value);
  const last =
    args.upToAndIncludingMessageId &&
    (await ctx.db.get(args.upToAndIncludingMessageId));
  assert(
    !last || last.threadId === args.threadId,
    "upToAndIncludingMessageId must be a message in the thread",
  );
  const toolOptions = args.excludeToolMessages ? [false] : [true, false];
  const order = args.order ?? "desc";
  const streams = toolOptions.flatMap((tool) =>
    statuses.map((status) =>
      stream(ctx.db, schema)
        .query("messages")
        .withIndex("threadId_status_tool_order_stepOrder", (q) => {
          const qq = q
            .eq("threadId", args.threadId)
            .eq("status", status)
            .eq("tool", tool);
          if (last) {
            return qq.lte("order", last.order);
          }
          return qq;
        })
        .order(order)
        .filterWith(async (m) => !last || m.order <= last.order),
    ),
  );
  const messages = await mergedStream(streams, ["order", "stepOrder"]).paginate(
    args.paginationOpts ?? {
      numItems: DEFAULT_RECENT_MESSAGES,
      cursor: null,
    },
  );
  if (messages.page.length === 0) {
    messages.isDone = true;
  }
  return messages;
}

export const getMessagesByIds = internalQuery({
  args: { messageIds: v.array(v.id("messages")) },
  handler: async (ctx, args) => {
    return (await Promise.all(args.messageIds.map((id) => ctx.db.get(id)))).map(
      (m) => (m ? publicMessage(m) : null),
    );
  },
  returns: v.array(v.union(v.null(), vMessageDoc)),
});
