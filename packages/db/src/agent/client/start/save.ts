import type { GenerateObjectResult, StepResult, ToolSet } from "ai";

import type { ModelOrMetadata } from "../../shared";
import type { MessageDoc, MessageWithMetadata } from "../../validators";
import type { ActionCtx, AgentComponent, Config, Options } from "../types";
import {
  serializeObjectResult,
  serializeResponseMessages,
} from "../../mapping";
import { getModelName, getProviderName } from "../../shared";

export type SaveInput<TOOLS extends ToolSet> =
  | { step: StepResult<TOOLS> }
  | { object: GenerateObjectResult<unknown> };

interface AddMessagesArgs {
  userId: string | undefined;
  threadId: string;
  agentName: string | undefined;
  promptMessageId: string | undefined;
  pendingMessageId: string | undefined;
  messages: MessageWithMetadata[];
  failPendingSteps: boolean;
  finishStreamId?: string;
}

/**
 * Type-narrowed wrapper around `component.messages.addMessages`. The
 * AgentComponent shim widens mutation returns to `any`; we assert the
 * concrete shape here so callers stay strongly typed.
 */
async function addMessages(
  ctx: ActionCtx,
  component: AgentComponent,
  args: AddMessagesArgs,
) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- AnyFn component shim returns `any`; narrow to the documented `addMessages` return shape.
  const result = (await ctx.runMutation(
    component.messages.addMessages,
    args,
  )) as { messages: MessageDoc[] };
  return result;
}

export interface CreateSaveHandlerDeps {
  ctx: ActionCtx;
  component: AgentComponent;
  threadId: string | undefined;
  userId: string | undefined;
  opts: Options &
    Config & {
      agentName: string;
    };
  promptMessageId: string | undefined;
  savedMessages: MessageDoc[];
  /**
   * Shared mutable handle pointing at the current pending assistant
   * message id. The save closure mutates `.id` across streamed steps so
   * the outer `fail` callback always targets the latest pending message.
   */
  pendingRef: { id: string | undefined };
  getActiveModel: () => ModelOrMetadata;
  fail: (reason: string) => Promise<void>;
}

/**
 * Build the `save` closure returned from `startGeneration`. Tracks which
 * response messages have already been persisted across streamed steps so we
 * only serialize the new ones in each step.
 */
export function createSaveHandler(deps: CreateSaveHandlerDeps) {
  const {
    ctx,
    component,
    threadId,
    userId,
    opts,
    promptMessageId,
    savedMessages,
    pendingRef,
    getActiveModel,
    fail,
  } = deps;
  const saveMessages = opts.storageOptions?.saveMessages ?? "promptAndOutput";
  // step.response.messages is cumulative across streamed steps; we track how
  // many messages we've already persisted so each step only serializes the
  // new tail (important for tool approval flows where the SDK appends extra
  // approval tool-results between steps).
  let previousResponseMessageCount = 0;

  return async function save<TOOLS extends ToolSet>(
    toSave: SaveInput<TOOLS>,
    createPendingMessage?: boolean,
    /**
     * If provided, finish this stream atomically with the message save.
     * Prevents UI flickering from separate mutations (issue #181).
     */
    finishStreamId?: string,
  ) {
    if (threadId && saveMessages !== "none") {
      const serialized = await serializeToSave({
        ctx,
        component,
        toSave,
        model: getActiveModel(),
        takeNewResponseMessages: () => {
          const all =
            "step" in toSave ? toSave.step.response.messages : undefined;
          if (!all) return undefined;
          const start = previousResponseMessageCount;
          previousResponseMessageCount = all.length;
          return all.slice(start);
        },
      });
      if (createPendingMessage) {
        serialized.messages.push({
          message: { role: "assistant", content: [] },
          status: "pending",
        });
      }
      const saved = await addMessages(ctx, component, {
        userId,
        threadId,
        agentName: opts.agentName,
        promptMessageId,
        pendingMessageId: pendingRef.id,
        messages: serialized.messages,
        failPendingSteps: false,
        finishStreamId,
      });
      pendingRef.id = await persistSavedMessages({
        saved,
        savedMessages,
        createPendingMessage: createPendingMessage ?? false,
        fail,
      });
    }
    const output = "object" in toSave ? toSave.object : toSave.step;
    if (opts.rawRequestResponseHandler) {
      await opts.rawRequestResponseHandler(ctx, {
        userId,
        threadId,
        agentName: opts.agentName,
        request: output.request,
        response: output.response,
      });
    }
    if (opts.usageHandler) {
      const activeModel = getActiveModel();
      await opts.usageHandler(ctx, {
        userId,
        threadId,
        agentName: opts.agentName,
        model: getModelName(activeModel),
        provider: getProviderName(activeModel),
        usage: output.usage,
        providerMetadata: output.providerMetadata,
      });
    }
  };
}

interface SerializeToSaveArgs<TOOLS extends ToolSet> {
  ctx: ActionCtx;
  component: AgentComponent;
  toSave: SaveInput<TOOLS>;
  model: ModelOrMetadata;
  takeNewResponseMessages: () =>
    | StepResult<TOOLS>["response"]["messages"]
    | undefined;
}

async function serializeToSave<TOOLS extends ToolSet>({
  ctx,
  component,
  toSave,
  model,
  takeNewResponseMessages,
}: SerializeToSaveArgs<TOOLS>) {
  if ("object" in toSave) {
    return serializeObjectResult({
      ctx,
      component,
      result: toSave.object,
      model,
    });
  }
  const newResponseMessages = takeNewResponseMessages() ?? [];
  return serializeResponseMessages({
    ctx,
    component,
    step: toSave.step,
    model,
    responseMessages: newResponseMessages,
  });
}

interface PersistArgs {
  saved: { messages: MessageDoc[] };
  savedMessages: MessageDoc[];
  createPendingMessage: boolean;
  fail: (reason: string) => Promise<void>;
}

async function persistSavedMessages({
  saved,
  savedMessages,
  createPendingMessage,
  fail,
}: PersistArgs) {
  const lastMessage = saved.messages.at(-1);
  if (!lastMessage) return undefined;
  if (!createPendingMessage) {
    savedMessages.push(...saved.messages);
    return undefined;
  }
  if (lastMessage.status === "failed") {
    savedMessages.push(...saved.messages);
    await fail(
      lastMessage.error ??
        "Aborting - the pending message was marked as failed",
    );
    return undefined;
  }
  savedMessages.push(...saved.messages.slice(0, -1));
  return lastMessage._id;
}
