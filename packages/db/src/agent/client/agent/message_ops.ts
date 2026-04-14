import type {
  GenerateObjectResult,
  LanguageModel,
  ModelMessage,
  StepResult,
  ToolSet,
} from "ai";

import type { Message, MessageWithMetadata } from "../../validators";
import type { ActionCtx, AgentComponent, MutationCtx } from "../types";
import {
  serializeMessage,
  serializeNewMessagesInStep,
  serializeObjectResult,
} from "../../mapping";
import { getModelName, getProviderName } from "../../shared";

interface ModelOpts {
  languageModel: LanguageModel;
}

export async function agentSaveStep<TOOLS extends ToolSet>(
  component: AgentComponent,
  options: ModelOpts & { name: string },
  ctx: ActionCtx,
  args: {
    userId?: string;
    threadId: string;
    promptMessageId: string;
    step: StepResult<TOOLS>;
    model?: string;
    provider?: string;
  },
) {
  const { messages } = await serializeNewMessagesInStep({
    ctx,
    component,
    step: args.step,
    model: {
      provider: args.provider ?? getProviderName(options.languageModel),
      model: args.model ?? getModelName(options.languageModel),
    },
  });

  return ctx.runMutation(component.messages.addMessages, {
    userId: args.userId,
    threadId: args.threadId,
    agentName: options.name,
    promptMessageId: args.promptMessageId,
    messages,
    failPendingSteps: false,
  });
}

export async function agentSaveObject(
  component: AgentComponent,
  options: ModelOpts & { name: string },
  ctx: ActionCtx,
  args: {
    userId: string | undefined;
    threadId: string;
    promptMessageId: string;
    model: string | undefined;
    provider: string | undefined;
    result: GenerateObjectResult<unknown>;
    metadata?: Omit<MessageWithMetadata, "message">;
  },
) {
  const { messages } = await serializeObjectResult({
    ctx,
    component,
    result: args.result,
    model: {
      model:
        args.model ??
        args.metadata?.model ??
        getModelName(options.languageModel),
      provider:
        args.provider ??
        args.metadata?.provider ??
        getProviderName(options.languageModel),
    },
  });

  return ctx.runMutation(component.messages.addMessages, {
    userId: args.userId,
    threadId: args.threadId,
    promptMessageId: args.promptMessageId,
    failPendingSteps: false,
    messages,
    agentName: options.name,
  });
}

export async function agentFinalizeMessage(
  component: AgentComponent,
  ctx: MutationCtx | ActionCtx,
  args: {
    messageId: string;
    result: { status: "failed"; error: string } | { status: "success" };
  },
) {
  await ctx.runMutation(component.messages.finalizeMessage, {
    messageId: args.messageId,
    result: args.result,
  });
}

export async function agentUpdateMessage(
  component: AgentComponent,
  ctx: MutationCtx | ActionCtx,
  args: {
    messageId: string;
    patch: {
      message: ModelMessage | Message;
      status: "success" | "error";
      error?: string;
    };
  },
) {
  const { message } = await serializeMessage(
    ctx,
    component,
    args.patch.message,
  );
  await ctx.runMutation(component.messages.updateMessage, {
    messageId: args.messageId,
    patch: {
      message,
      status: args.patch.status === "success" ? "success" : "failed",
      error: args.patch.error,
    },
  });
}

export async function agentDeleteMessages(
  component: AgentComponent,
  ctx: MutationCtx | ActionCtx,
  args: { messageIds: string[] },
) {
  await ctx.runMutation(component.messages.deleteByIds, args);
}

export async function agentDeleteMessage(
  component: AgentComponent,
  ctx: MutationCtx | ActionCtx,
  args: { messageId: string },
) {
  await ctx.runMutation(component.messages.deleteByIds, {
    messageIds: [args.messageId],
  });
}

export async function agentDeleteMessageRange(
  component: AgentComponent,
  ctx: MutationCtx | ActionCtx,
  args: {
    threadId: string;
    startOrder: number;
    startStepOrder?: number;
    endOrder: number;
    endStepOrder?: number;
  },
) {
  return ctx.runMutation(component.messages.deleteByOrder, {
    threadId: args.threadId,
    startOrder: args.startOrder,
    startStepOrder: args.startStepOrder,
    endOrder: args.endOrder,
    endStepOrder: args.endStepOrder,
  });
}
