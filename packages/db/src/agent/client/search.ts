import type { ModelMessage } from "ai";
import { assert } from "convex-helpers";

import type { Message, MessageDoc } from "../validators";
import type {
  ActionCtx,
  AgentComponent,
  Config,
  ContextOptions,
  MutationCtx,
  Options,
  QueryCtx,
} from "./types";
import {
  autoDenyUnresolvedApprovals,
  docsToModelMessages,
  toModelMessage,
} from "../mapping";
import { DEFAULT_RECENT_MESSAGES, sorted } from "../shared";

/**
 * Fetch the context messages for a thread.
 *
 * NOTE: this is the trimmed version of the original `@convex-dev/agent`
 * `fetchContextMessages` — vector search and embeddings have been removed
 * because the host app does not use them. We only ever fetch the most
 * recent N successful messages from a thread.
 */
export async function fetchContextMessages(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  component: AgentComponent,
  args: {
    userId: string | undefined;
    threadId: string | undefined;
    targetMessageId?: string;
    /** @deprecated use targetMessageId */
    upToAndIncludingMessageId?: string;
    contextOptions: ContextOptions;
  },
): Promise<MessageDoc[]> {
  const { recentMessages } = await fetchRecentMessages(ctx, component, args);
  return recentMessages;
}

async function fetchRecentMessages(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  component: AgentComponent,
  args: {
    userId: string | undefined;
    threadId: string | undefined;
    targetMessageId?: string;
    upToAndIncludingMessageId?: string;
    contextOptions: ContextOptions;
  },
): Promise<{ recentMessages: MessageDoc[] }> {
  assert(args.userId || args.threadId, "Specify userId or threadId");
  const opts = args.contextOptions;
  let recentMessages: MessageDoc[] = [];
  const targetMessageId =
    args.targetMessageId ?? args.upToAndIncludingMessageId;
  if (args.threadId && opts.recentMessages !== 0) {
    const { page } = await ctx.runQuery(
      component.messages.listMessagesByThreadId,
      {
        threadId: args.threadId,
        excludeToolMessages: opts.excludeToolMessages,
        paginationOpts: {
          numItems: opts.recentMessages ?? DEFAULT_RECENT_MESSAGES,
          cursor: null,
        },
        upToAndIncludingMessageId: targetMessageId,
        order: "desc",
        statuses: ["success"],
      },
    );
    recentMessages = filterOutOrphanedToolMessages(sorted(page));
  }
  return { recentMessages };
}

/**
 * Filter out tool messages that don't have both a tool call and response.
 * For the approval workflow, tool calls with approval responses (but no
 * tool-results yet) should also be kept.
 */
export function filterOutOrphanedToolMessages(
  docs: MessageDoc[],
): MessageDoc[] {
  const toolCallIds = new Set<string>();
  const toolResultIds = new Set<string>();
  const approvalRequestsByToolCallId = new Map<string, string>();
  const approvalResponseIds = new Set<string>();

  for (const doc of docs) {
    if (doc.message && Array.isArray(doc.message.content)) {
      for (const content of doc.message.content) {
        if (content.type === "tool-call") {
          toolCallIds.add(content.toolCallId);
        } else if (content.type === "tool-result") {
          toolResultIds.add(content.toolCallId);
        } else if (content.type === "tool-approval-request") {
          const req = content as {
            type: "tool-approval-request";
            toolCallId: string;
            approvalId: string;
          };
          approvalRequestsByToolCallId.set(req.toolCallId, req.approvalId);
        } else if (content.type === "tool-approval-response") {
          const res = content as {
            type: "tool-approval-response";
            approvalId: string;
          };
          approvalResponseIds.add(res.approvalId);
        }
      }
    }
  }

  const hasApprovalResponse = (toolCallId: string) => {
    const approvalId = approvalRequestsByToolCallId.get(toolCallId);
    return approvalId !== undefined && approvalResponseIds.has(approvalId);
  };
  const hasApprovalRequest = (toolCallId: string) =>
    approvalRequestsByToolCallId.has(toolCallId);

  const result: MessageDoc[] = [];
  for (const doc of docs) {
    if (
      doc.message?.role === "assistant" &&
      Array.isArray(doc.message.content)
    ) {
      const content = doc.message.content.filter(
        (p) =>
          p.type !== "tool-call" ||
          toolResultIds.has(p.toolCallId) ||
          hasApprovalResponse(p.toolCallId) ||
          hasApprovalRequest(p.toolCallId),
      );
      if (content.length) {
        result.push({ ...doc, message: { ...doc.message, content } });
      }
    } else if (doc.message?.role === "tool") {
      const content = doc.message.content.filter((c) => {
        if (c.type === "tool-result") {
          return toolCallIds.has(c.toolCallId);
        }
        return true;
      });
      if (content.length) {
        result.push({ ...doc, message: { ...doc.message, content } });
      }
    } else {
      result.push(doc);
    }
  }
  return result;
}

/**
 * Build the LLM prompt: system instructions + recent thread history +
 * input messages + the prompt itself + any existing responses to the
 * prompt message.
 */
export async function fetchContextWithPrompt(
  ctx: ActionCtx,
  component: AgentComponent,
  args: {
    prompt: string | (ModelMessage | Message)[] | undefined;
    messages: (ModelMessage | Message)[] | undefined;
    promptMessageId: string | undefined;
    userId: string | undefined;
    threadId: string | undefined;
    agentName?: string;
  } & Options &
    Config,
): Promise<{
  messages: ModelMessage[];
  order: number | undefined;
  stepOrder: number | undefined;
}> {
  const { threadId, userId } = args;
  const promptArray = getPromptArray(args.prompt);

  const { recentMessages } = await fetchRecentMessages(ctx, component, {
    userId,
    threadId,
    targetMessageId: args.promptMessageId,
    contextOptions: args.contextOptions ?? {},
  });

  const promptMessageIndex = args.promptMessageId
    ? recentMessages.findIndex((m) => m._id === args.promptMessageId)
    : -1;
  const promptMessage =
    promptMessageIndex !== -1 ? recentMessages[promptMessageIndex] : undefined;
  let prePromptDocs = recentMessages;
  const messages = args.messages ?? [];
  let existingResponseDocs: MessageDoc[] = [];
  if (promptMessage) {
    prePromptDocs = recentMessages.slice(0, promptMessageIndex);
    existingResponseDocs = recentMessages.slice(promptMessageIndex + 1);
    if (promptArray.length === 0 && promptMessage.message) {
      promptArray.push(promptMessage.message);
    }
  }

  const recent = docsToModelMessages(prePromptDocs);
  const inputMessages = messages.map(toModelMessage);
  const inputPrompt = promptArray.map(toModelMessage);
  const existingResponses = docsToModelMessages(existingResponseDocs);

  const allMessages = [
    ...recent,
    ...inputMessages,
    ...inputPrompt,
    ...existingResponses,
  ];
  let processedMessages = args.contextHandler
    ? await args.contextHandler(ctx, {
        allMessages,
        search: [],
        recent,
        inputMessages,
        inputPrompt,
        existingResponses,
        userId,
        threadId,
      })
    : allMessages;

  processedMessages = autoDenyUnresolvedApprovals(processedMessages);

  return {
    messages: processedMessages,
    order: promptMessage?.order,
    stepOrder: promptMessage?.stepOrder,
  };
}

export function getPromptArray(
  prompt: string | (ModelMessage | Message)[] | undefined,
): (ModelMessage | Message)[] {
  return !prompt
    ? []
    : Array.isArray(prompt)
      ? prompt
      : [{ role: "user", content: prompt }];
}
