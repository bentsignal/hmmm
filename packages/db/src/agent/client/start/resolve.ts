import type { ModelMessage } from "ai";

import type { Message, MessageDoc } from "../../validators";
import type { ActionCtx, AgentComponent, Config, Options } from "../types";
import { saveInputMessages } from "../save_input_messages";

/**
 * Resolve the effective userId for a generation call. Prefers the caller-
 * provided userId; otherwise falls back to the thread's owner.
 */
export async function resolveUserId(
  ctx: ActionCtx,
  component: AgentComponent,
  opts: { userId?: string | null },
  threadId: string | undefined,
) {
  if (opts.userId !== undefined && opts.userId !== null) {
    return opts.userId;
  }
  if (!threadId) return undefined;
  const thread = await ctx.runQuery(component.threads.getThread, {
    threadId,
  });
  return thread?.userId ?? undefined;
}

function emptyInputs(
  promptMessageId: string | undefined,
  pendingMessage: MessageDoc | undefined = undefined,
  savedMessages: MessageDoc[] = [],
) {
  return { promptMessageId, pendingMessage, savedMessages };
}

/**
 * If messages are to be persisted, run `saveInputMessages` to create/open a
 * pending assistant message. Otherwise return a stub with no pending state.
 */
export async function resolveInputs(
  ctx: ActionCtx,
  component: AgentComponent,
  args: {
    prompt: string | (ModelMessage | Message)[] | undefined;
    messages: (ModelMessage | Message)[] | undefined;
    promptMessageId: string | undefined;
  },
  opts: Options &
    Config & {
      userId: string | undefined;
      threadId: string | undefined;
      agentName: string;
    },
) {
  const saveMessages = opts.storageOptions?.saveMessages ?? "promptAndOutput";
  if (!opts.threadId || saveMessages === "none") {
    return emptyInputs(args.promptMessageId);
  }
  return saveInputMessages(ctx, component, {
    ...opts,
    threadId: opts.threadId,
    prompt: args.prompt,
    messages: args.messages,
    promptMessageId: args.promptMessageId,
    storageOptions: { saveMessages },
  });
}
