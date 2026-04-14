import { type ModelMessage } from "ai";

import type { Message, MessageDoc } from "../validators";
import type { ActionCtx, AgentComponent, Config, MutationCtx } from "./types";
import { saveMessages } from "./messages";
import { getPromptArray } from "./search";

export async function saveInputMessages(
  ctx: MutationCtx | ActionCtx,
  component: AgentComponent,
  {
    threadId,
    userId,
    prompt,
    messages,
    ...args
  }: {
    prompt: string | (ModelMessage | Message)[] | undefined;
    messages: (ModelMessage | Message)[] | undefined;
    promptMessageId: string | undefined;
    userId: string | undefined;
    threadId: string;
    agentName?: string;
    storageOptions?: {
      saveMessages?: "all" | "promptAndOutput";
    };
  } & Pick<Config, "usageHandler" | "callSettings">,
): Promise<{
  promptMessageId: string | undefined;
  pendingMessage: MessageDoc;
  savedMessages: MessageDoc[];
}> {
  const shouldSave = args.storageOptions?.saveMessages ?? "promptAndOutput";
  const promptArray = getPromptArray(prompt);

  const toSave: (ModelMessage | Message)[] = [];
  if (args.promptMessageId) {
    // No inputs saved when a promptMessageId is provided.
  } else if (shouldSave === "all") {
    if (messages) toSave.push(...messages);
    toSave.push(...promptArray);
  } else {
    if (promptArray.length) {
      toSave.push(...promptArray);
    } else if (messages) {
      toSave.push(...messages.slice(-1));
    }
  }
  const saved = await saveMessages(ctx, component, {
    threadId,
    userId,
    messages: [...toSave, { role: "assistant", content: [] }],
    metadata: [
      ...Array.from({ length: toSave.length }, () => ({})),
      { status: "pending" },
    ],
    failPendingSteps: !!args.promptMessageId,
    promptMessageId: args.promptMessageId,
  });
  return {
    promptMessageId: toSave.length
      ? saved.messages.at(-2)!._id
      : args.promptMessageId,
    pendingMessage: saved.messages.at(-1)!,
    savedMessages: saved.messages.slice(0, -1),
  };
}
