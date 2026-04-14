import type {
  FlexibleSchema,
  IdGenerator,
  InferSchema,
} from "@ai-sdk/provider-utils";
import type {
  CallSettings,
  GenerateObjectResult,
  GenerateTextResult,
  LanguageModel,
  ModelMessage,
  StepResult,
  StopCondition,
  StreamTextResult,
  ToolChoice,
  ToolSet,
} from "ai";
import type { Value } from "convex/values";
import { generateObject, generateText, stepCountIs, streamObject } from "ai";
import { assert, omit, pick } from "convex-helpers";
import {
  type GenericActionCtx,
  type GenericDataModel,
  type PaginationOptions,
  type PaginationResult,
  type WithoutSystemFields,
} from "convex/server";
import { convexToJson, v } from "convex/values";

import type {
  Message,
  MessageDoc,
  MessageStatus,
  MessageWithMetadata,
  ProviderMetadata,
  StreamArgs,
  ThreadDoc,
} from "../validators";
import type { SaveMessageArgs, SaveMessagesArgs } from "./messages";
import type { StreamingOptions } from "./streaming";
import type {
  ActionCtx,
  AgentComponent,
  AgentPrompt,
  Config,
  ContextOptions,
  GenerateObjectArgs,
  GenerationOutputMetadata,
  MaybeCustomCtx,
  MutationCtx,
  ObjectMode,
  Options,
  Output,
  QueryCtx,
  RawRequestResponseHandler,
  StorageOptions,
  StreamingTextArgs,
  StreamObjectArgs,
  SyncStreamsReturnValue,
  TextArgs,
  Thread,
  UsageHandler,
} from "./types";
import {
  serializeMessage,
  serializeNewMessagesInStep,
  serializeObjectResult,
  toModelMessage,
} from "../mapping";
import { getModelName, getProviderName } from "../shared";
import {
  vMessageWithMetadata,
  vSafeObjectArgs,
  vTextArgs,
} from "../validators";
import { listMessages, saveMessages } from "./messages";
import { startGeneration } from "./start";
import { syncStreams } from "./streaming";
import { streamText } from "./streamText";
import { createThread, getThreadMetadata } from "./threads";
import { errorToString, willContinue } from "./utils";

type JSONValue =
  | null
  | string
  | number
  | boolean
  | JSONValue[]
  | { [k: string]: JSONValue };

export { stepCountIs } from "ai";
export {
  docsToModelMessages,
  toModelMessage,
  //** @deprecated use toModelMessage instead */
  toModelMessage as deserializeMessage,
  guessMimeType,
  serializeDataOrUrl,
  serializeMessage,
  toUIFilePart,
} from "../mapping";
export { extractText, isTool, sorted } from "../shared";
export {
  vAssistantMessage,
  vContent,
  vContextOptions,
  vMessage,
  vMessageDoc,
  vPaginationResult,
  vProviderMetadata,
  vSource,
  vStorageOptions,
  vStreamArgs,
  vSystemMessage,
  vThreadDoc,
  vToolMessage,
  vUsage,
  vUserMessage,
  type Message,
  type MessageDoc,
  type SourcePart,
  type ThreadDoc,
  type Usage,
} from "../validators";
export { createTool, type ToolCtx } from "./createTool";
export {
  listMessages,
  listUIMessages,
  saveMessage,
  saveMessages,
  type SaveMessageArgs,
  type SaveMessagesArgs,
} from "./messages";
export { startGeneration } from "./start";
export {
  DEFAULT_STREAMING_OPTIONS,
  DeltaStreamer,
  abortStream,
  compressUIMessageChunks,
  listStreams,
  syncStreams,
  vStreamMessagesReturnValue,
} from "./streaming";
export {
  createThread,
  getThreadMetadata,
  searchThreadTitles,
  updateThreadMetadata,
} from "./threads";
export type { ContextHandler } from "./types";
export { toUIMessages, fromUIMessages, type UIMessage } from "../UIMessages";

export type {
  AgentComponent,
  Config,
  ContextOptions,
  ProviderMetadata,
  RawRequestResponseHandler,
  StorageOptions,
  StreamArgs,
  SyncStreamsReturnValue,
  Thread,
  UsageHandler,
};

export class Agent<
  /**
   * You can require that all `ctx` args to generateText & streamText
   * have a certain shape by passing a type here.
   * e.g.
   * ```ts
   * const myAgent = new Agent<{ orgId: string }>(...);
   * ```
   * This is useful if you want to share that type in `createTool`
   * e.g.
   * ```ts
   * type MyCtx = ToolCtx & { orgId: string };
   * const myTool = createTool({
   *   args: z.object({...}),
   *   description: "...",
   *   handler: async (ctx: MyCtx, args) => {
   *     // use ctx.orgId
   *   },
   * });
   */
  CustomCtx extends object = object,
  AgentTools extends ToolSet = any,
> {
  constructor(
    public component: AgentComponent,
    public options: Config & {
      /**
       * The name for the agent. This will be attributed on each message
       * created by this agent.
       */
      name: string;
      /**
       * The LLM model to use for generating / streaming text and objects.
       * e.g.
       * import { openai } from "@ai-sdk/openai"
       * const myAgent = new Agent(components.agent, {
       *   languageModel: openai.chat("gpt-4o-mini"),
       */
      languageModel: LanguageModel;
      /**
       * The default system prompt to put in each request.
       * Override per-prompt by passing the "system" parameter.
       */
      instructions?: string;
      /**
       * Tools that the agent can call out to and get responses from.
       * They can be AI SDK tools (import {tool} from "ai")
       * or tools that have Convex context
       * (import { createTool } from "@convex-dev/agent")
       */
      tools?: AgentTools;
      /**
       * When generating or streaming text with tools available, this
       * determines when to stop. Defaults to the AI SDK default.
       */
      stopWhen?:
        | StopCondition<NoInfer<AgentTools>>
        | Array<StopCondition<NoInfer<AgentTools>>>;
    },
  ) {
    // Embeddings/search support was dropped when this code was inlined into
    // the host app (we don't use vector search). Constructor is now a no-op.
  }

  /**
   * Start a new thread with the agent. This will have a fresh history, though if
   * you pass in a userId you can have it search across other threads for relevant
   * messages as context for the LLM calls.
   * @param ctx The context of the Convex function. From an action, you can thread
   *   with the agent. From a mutation, you can start a thread and save the threadId
   *   to pass to continueThread later.
   * @param args The thread metadata.
   * @returns The threadId of the new thread and the thread object.
   */
  async createThread(
    ctx: ActionCtx & CustomCtx,
    args?: {
      /**
       * The userId to associate with the thread. If not provided, the thread will be
       * anonymous.
       */
      userId?: string | null;
      /**
       * The title of the thread. Not currently used for anything.
       */
      title?: string;
      /**
       * The summary of the thread. Not currently used for anything.
       */
      summary?: string;
    },
  ): Promise<{ threadId: string; thread: Thread<AgentTools> }>;
  /**
   * Start a new thread with the agent. This will have a fresh history, though if
   * you pass in a userId you can have it search across other threads for relevant
   * messages as context for the LLM calls.
   * @param ctx The context of the Convex function. From a mutation, you can
   * start a thread and save the threadId to pass to continueThread later.
   * @param args The thread metadata.
   * @returns The threadId of the new thread.
   */
  async createThread(
    ctx: MutationCtx,
    args?: {
      /**
       * The userId to associate with the thread. If not provided, the thread will be
       * anonymous.
       */
      userId?: string | null;
      /**
       * The title of the thread. Not currently used for anything.
       */
      title?: string;
      /**
       * The summary of the thread. Not currently used for anything.
       */
      summary?: string;
    },
  ): Promise<{ threadId: string }>;
  async createThread(
    ctx: (ActionCtx & CustomCtx) | MutationCtx,
    args?: { userId: string | null; title?: string; summary?: string },
  ): Promise<{ threadId: string; thread?: Thread<AgentTools> }> {
    const threadId = await createThread(ctx, this.component, args);
    if (!("runAction" in ctx) || "workflowId" in ctx) {
      return { threadId };
    }
    const { thread } = await this.continueThread(ctx, {
      threadId,
      userId: args?.userId,
    });
    return { threadId, thread };
  }

  /**
   * Continues a thread using this agent. Note: threads can be continued
   * by different agents. This is a convenience around calling the various
   * generate and stream functions with explicit userId and threadId parameters.
   * @param ctx The ctx object passed to the action handler
   * @param { threadId, userId }: the thread and user to associate the messages with.
   * @returns Functions bound to the userId and threadId on a `{thread}` object.
   */
  async continueThread(
    ctx: ActionCtx & CustomCtx,
    args: {
      /**
       * The associated thread created by {@link createThread}
       */
      threadId: string;
      /**
       * If supplied, the userId can be used to search across other threads for
       * relevant messages from the same user as context for the LLM calls.
       */
      userId?: string | null;
    },
  ): Promise<{ thread: Thread<AgentTools> }> {
    return {
      thread: {
        threadId: args.threadId,
        getMetadata: this.getThreadMetadata.bind(this, ctx, {
          threadId: args.threadId,
        }),
        updateMetadata: (patch: Partial<WithoutSystemFields<ThreadDoc>>) =>
          ctx.runMutation(this.component.threads.updateThread, {
            threadId: args.threadId,
            patch,
          }),
        generateText: this.generateText.bind(this, ctx, args),
        streamText: this.streamText.bind(this, ctx, args),
        generateObject: this.generateObject.bind(this, ctx, args),
        streamObject: this.streamObject.bind(this, ctx, args),
      } as Thread<AgentTools>,
    };
  }

  async start<
    TOOLS extends ToolSet | undefined,
    T extends {
      _internal?: { generateId?: IdGenerator };
    },
  >(
    ctx: ActionCtx & CustomCtx,
    /**
     * These are the arguments you'll pass to the LLM call such as
     * `generateText` or `streamText`. This function will look up the context
     * and provide functions to save the steps, abort the generation, and more.
     * The type of the arguments returned infers from the type of the arguments
     * you pass here.
     */
    args: T &
      AgentPrompt & {
        /**
         * The tools to use for the tool calls. This will override tools specified
         * in the Agent constructor or createThread / continueThread.
         */
        tools?: TOOLS;
        /**
         * The abort signal to be passed to the LLM call. If triggered, it will
         * mark the pending message as failed. If the generation is asynchronously
         * aborted, it will trigger this signal when detected.
         */
        abortSignal?: AbortSignal;
        stopWhen?:
          | StopCondition<TOOLS extends undefined ? AgentTools : TOOLS>
          | Array<StopCondition<TOOLS extends undefined ? AgentTools : TOOLS>>;
      },
    options?: Options & { userId?: string | null; threadId?: string },
  ): Promise<{
    args: T & {
      system?: string;
      model: LanguageModel;
      prompt?: never;
      messages: ModelMessage[];
      tools?: TOOLS extends undefined ? AgentTools : TOOLS;
    } & CallSettings;
    order: number;
    stepOrder: number;
    userId: string | undefined;
    promptMessageId: string | undefined;
    updateModel: (model: LanguageModel | undefined) => void;
    save: <TOOLS extends ToolSet>(
      toSave:
        | { step: StepResult<TOOLS> }
        | { object: GenerateObjectResult<unknown> },
      createPendingMessage?: boolean,
    ) => Promise<void>;
    fail: (reason: string) => Promise<void>;
    getSavedMessages: () => MessageDoc[];
  }> {
    type Tools = TOOLS extends undefined ? AgentTools : TOOLS;
    return startGeneration<T, Tools, CustomCtx>(
      ctx,
      this.component,
      {
        ...args,
        tools: (args.tools ?? this.options.tools) as Tools,
        system: args.system ?? this.options.instructions,
        stopWhen: (args.stopWhen ?? this.options.stopWhen) as any,
      },
      {
        ...this.options,
        ...options,
        agentName: this.options.name,
        agentForToolCtx: this,
      },
    );
  }

  /**
   * This behaves like {@link generateText} from the "ai" package except that
   * it add context based on the userId and threadId and saves the input and
   * resulting messages to the thread, if specified.
   * Use {@link continueThread} to get a version of this function already scoped
   * to a thread (and optionally userId).
   * @param ctx The context passed from the action function calling this.
   * @param scope: The user and thread to associate the message with
   * @param generateTextArgs The arguments to the generateText function, along
   * with {@link AgentPrompt} options, such as promptMessageId.
   * @param options Extra controls for the {@link ContextOptions} and {@link StorageOptions}.
   * @returns The result of the generateText function.
   */
  async generateText<
    TOOLS extends ToolSet | undefined = undefined,
    OUTPUT extends Output<any, any, any> = never,
  >(
    ctx: ActionCtx & CustomCtx,
    threadOpts: { userId?: string | null; threadId?: string },
    /**
     * The arguments to the generateText function, similar to the ai sdk's
     * {@link generateText} function, along with Agent prompt options.
     */
    generateTextArgs: AgentPrompt & TextArgs<AgentTools, TOOLS, OUTPUT>,
    options?: Options,
  ): Promise<
    GenerateTextResult<TOOLS extends undefined ? AgentTools : TOOLS, OUTPUT> &
      GenerationOutputMetadata
  > {
    const { args, promptMessageId, order, ...call } = await this.start(
      ctx,
      generateTextArgs,
      { ...threadOpts, ...options },
    );

    type Tools = TOOLS extends undefined ? AgentTools : TOOLS;
    const steps: StepResult<Tools>[] = [];
    try {
      const result = (await generateText<Tools, OUTPUT>({
        ...args,
        prepareStep: async (options) => {
          const result = await generateTextArgs.prepareStep?.(options);
          call.updateModel(result?.model ?? options.model);
          return result;
        },
        onStepFinish: async (step) => {
          steps.push(step);
          await call.save({ step }, await willContinue(steps, args.stopWhen));
          return generateTextArgs.onStepFinish?.(step);
        },
      })) as GenerateTextResult<Tools, OUTPUT>;
      const metadata: GenerationOutputMetadata = {
        promptMessageId,
        order,
        savedMessages: call.getSavedMessages(),
        messageId: promptMessageId,
      };
      return Object.assign(result, metadata);
    } catch (error) {
      await call.fail(errorToString(error));
      throw error;
    }
  }

  /**
   * This behaves like {@link streamText} from the "ai" package except that
   * it add context based on the userId and threadId and saves the input and
   * resulting messages to the thread, if specified.
   * Use {@link continueThread} to get a version of this function already scoped
   * to a thread (and optionally userId).
   */
  async streamText<
    TOOLS extends ToolSet | undefined = undefined,
    OUTPUT extends Output<any, any, any> = never,
  >(
    ctx: ActionCtx & CustomCtx,
    threadOpts: { userId?: string | null; threadId?: string },
    /**
     * The arguments to the streamText function, similar to the ai sdk's
     * {@link streamText} function, along with Agent prompt options.
     */
    streamTextArgs: AgentPrompt & StreamingTextArgs<AgentTools, TOOLS, OUTPUT>,
    /**
     * The {@link ContextOptions} and {@link StorageOptions}
     * options to use for fetching contextual messages and saving input/output messages.
     */
    options?: Options & {
      /**
       * Whether to save incremental data (deltas) from streaming responses.
       * Defaults to false.
       * If false, it will not save any deltas to the database.
       * If true, it will save deltas with {@link DEFAULT_STREAMING_OPTIONS}.
       *
       * Regardless of this option, when streaming you are able to use this
       * `streamText` function as you would with the "ai" package's version:
       * iterating over the text, streaming it over HTTP, etc.
       */
      saveStreamDeltas?: boolean | StreamingOptions;
    },
  ): Promise<
    StreamTextResult<TOOLS extends undefined ? AgentTools : TOOLS, OUTPUT> &
      GenerationOutputMetadata
  > {
    type Tools = TOOLS extends undefined ? AgentTools : TOOLS;
    return streamText<Tools, OUTPUT>(
      ctx,
      this.component,
      {
        ...streamTextArgs,
        model: streamTextArgs.model ?? this.options.languageModel,
        tools: (streamTextArgs.tools ?? this.options.tools) as Tools,
        system: streamTextArgs.system ?? this.options.instructions,
        stopWhen: (streamTextArgs.stopWhen ?? this.options.stopWhen) as any,
      },
      {
        ...threadOpts,
        ...this.options,
        agentName: this.options.name,
        agentForToolCtx: this,
        ...options,
      },
    );
  }

  /**
   * This behaves like {@link generateObject} from the "ai" package except that
   * it add context based on the userId and threadId and saves the input and
   * resulting messages to the thread, if specified.
   * Use {@link continueThread} to get a version of this function already scoped
   * to a thread (and optionally userId).
   */
  async generateObject<
    SCHEMA extends FlexibleSchema<unknown> = FlexibleSchema<JSONValue>,
    OUTPUT extends ObjectMode = InferSchema<SCHEMA> extends string
      ? "enum"
      : "object",
    RESULT = OUTPUT extends "array"
      ? Array<InferSchema<SCHEMA>>
      : InferSchema<SCHEMA>,
  >(
    ctx: ActionCtx & CustomCtx,
    threadOpts: { userId?: string | null; threadId?: string },
    /**
     * The arguments to the generateObject function, similar to the ai sdk's
     * {@link generateObject} function, along with Agent prompt options.
     */
    generateObjectArgs: AgentPrompt &
      GenerateObjectArgs<SCHEMA, OUTPUT, RESULT>,
    /**
     * The {@link ContextOptions} and {@link StorageOptions}
     * options to use for fetching contextual messages and saving input/output messages.
     */
    options?: Options,
  ): Promise<GenerateObjectResult<RESULT> & GenerationOutputMetadata> {
    const { args, promptMessageId, order, fail, save, getSavedMessages } =
      await this.start(ctx, generateObjectArgs, { ...threadOpts, ...options });

    try {
      const result = (await generateObject(
        args,
      )) as GenerateObjectResult<RESULT>;

      await save({ object: result });
      const metadata: GenerationOutputMetadata = {
        promptMessageId,
        order,
        savedMessages: getSavedMessages(),
        messageId: promptMessageId,
      };
      return Object.assign(result, metadata);
    } catch (error) {
      await fail(errorToString(error));
      throw error;
    }
  }

  /**
   * This behaves like `streamObject` from the "ai" package except that
   * it add context based on the userId and threadId and saves the input and
   * resulting messages to the thread, if specified.
   * Use {@link continueThread} to get a version of this function already scoped
   * to a thread (and optionally userId).
   */
  async streamObject<
    SCHEMA extends FlexibleSchema<unknown> = FlexibleSchema<JSONValue>,
    OUTPUT extends ObjectMode = InferSchema<SCHEMA> extends string
      ? "enum"
      : "object",
    RESULT = OUTPUT extends "array"
      ? Array<InferSchema<SCHEMA>>
      : InferSchema<SCHEMA>,
  >(
    ctx: ActionCtx & CustomCtx,
    threadOpts: { userId?: string | null; threadId?: string },
    /**
     * The arguments to the streamObject function, similar to the ai sdk's
     * {@link streamObject} function, along with Agent prompt options.
     */
    streamObjectArgs: AgentPrompt & StreamObjectArgs<SCHEMA, OUTPUT, RESULT>,
    /**
     * The {@link ContextOptions} and {@link StorageOptions}
     * options to use for fetching contextual messages and saving input/output messages.
     */
    options?: Options,
  ): Promise<
    ReturnType<typeof streamObject<SCHEMA, OUTPUT, RESULT>> &
      GenerationOutputMetadata
  > {
    const { args, promptMessageId, order, fail, save, getSavedMessages } =
      await this.start(ctx, streamObjectArgs, { ...threadOpts, ...options });

    const stream = streamObject<SCHEMA, OUTPUT, RESULT>({
      ...(args as any),
      onError: async (error) => {
        console.error(" streamObject onError", error);
        // TODO: content that we have so far
        // content: stream.fullStream.
        await fail(errorToString(error.error));
        return args.onError?.(error);
      },
      onFinish: async (result) => {
        await save({
          object: {
            object: result.object,
            finishReason: result.error ? "error" : "stop",
            usage: result.usage,
            warnings: result.warnings,
            request: await stream.request,
            response: result.response,
            providerMetadata: result.providerMetadata,
            toJsonResponse: stream.toTextStreamResponse,
            reasoning: undefined,
          },
        });
        return args.onFinish?.(result);
      },
    });
    const metadata: GenerationOutputMetadata = {
      promptMessageId,
      order,
      savedMessages: getSavedMessages(),
      messageId: promptMessageId,
    };
    return Object.assign(stream, metadata);
  }

  /**
   * Save a message to the thread.
   * @param ctx A ctx object from a mutation or action.
   * @param args The message and what to associate it with (user / thread)
   * You can pass extra metadata alongside the message, e.g. associated fileIds.
   * @returns The messageId of the saved message.
   */
  async saveMessage(ctx: MutationCtx | ActionCtx, args: SaveMessageArgs) {
    const { messages } = await this.saveMessages(ctx, {
      threadId: args.threadId,
      userId: args.userId,
      messages:
        args.prompt !== undefined
          ? [{ role: "user", content: args.prompt }]
          : [args.message],
      metadata: args.metadata ? [args.metadata] : undefined,
      promptMessageId: args.promptMessageId,
      pendingMessageId: args.pendingMessageId,
    });
    const message = messages.at(-1)!;
    return { messageId: message._id, message };
  }

  /**
   * Explicitly save messages associated with the thread (& user if provided)
   * If you have an embedding model set, it will also generate embeddings for
   * the messages.
   * @param ctx The ctx parameter to a mutation or action.
   * @param args The messages and context to save
   * @returns
   */
  async saveMessages(
    ctx: MutationCtx | ActionCtx,
    args: SaveMessagesArgs,
  ): Promise<{ messages: MessageDoc[] }> {
    return saveMessages(ctx, this.component, {
      ...args,
      agentName: this.options.name,
    });
  }

  /**
   * List messages from a thread.
   * @param ctx A ctx object from a query, mutation, or action.
   * @param args.threadId The thread to list messages from.
   * @param args.paginationOpts Pagination options (e.g. via usePaginatedQuery).
   * @param args.excludeToolMessages Whether to exclude tool messages.
   *   False by default.
   * @param args.statuses What statuses to include. All by default.
   * @returns The MessageDoc's in a format compatible with usePaginatedQuery.
   */
  async listMessages(
    ctx: QueryCtx | MutationCtx | ActionCtx,
    args: {
      threadId: string;
      paginationOpts: PaginationOptions;
      excludeToolMessages?: boolean;
      statuses?: MessageStatus[];
    },
  ): Promise<PaginationResult<MessageDoc>> {
    return listMessages(ctx, this.component, args);
  }

  /**
   * A function that handles fetching stream deltas, used with the React hooks
   * `useThreadMessages` or `useStreamingThreadMessages`.
   * @param ctx A ctx object from a query, mutation, or action.
   * @param args.threadId The thread to sync streams for.
   * @param args.streamArgs The stream arguments with per-stream cursors.
   * @returns The deltas for each stream from their existing cursor.
   */
  async syncStreams(
    ctx: QueryCtx | MutationCtx | ActionCtx,
    args: {
      threadId: string;
      streamArgs: StreamArgs | undefined;
      // By default, only streaming messages are included.
      includeStatuses?: ("streaming" | "finished" | "aborted")[];
    },
  ): Promise<SyncStreamsReturnValue | undefined> {
    return syncStreams(ctx, this.component, args);
  }

  /**
   * Get the metadata for a thread.
   * @param ctx A ctx object from a query, mutation, or action.
   * @param args.threadId The thread to get the metadata for.
   * @returns The metadata for the thread.
   */
  async getThreadMetadata(
    ctx: QueryCtx | MutationCtx | ActionCtx,
    args: { threadId: string },
  ): Promise<ThreadDoc> {
    return getThreadMetadata(ctx, this.component, args);
  }

  /**
   * Update the metadata for a thread.
   * @param ctx A ctx object from a mutation or action.
   * @param args.threadId The thread to update the metadata for.
   * @param args.patch The patch to apply to the thread.
   * @returns The updated thread metadata.
   */
  async updateThreadMetadata(
    ctx: MutationCtx | ActionCtx,
    args: {
      threadId: string;
      patch: Partial<
        Pick<ThreadDoc, "title" | "summary" | "status" | "userId">
      >;
    },
  ): Promise<ThreadDoc> {
    const thread = await ctx.runMutation(
      this.component.threads.updateThread,
      args,
    );
    return thread;
  }

  // generateEmbeddings / generateAndSaveEmbeddings removed when this code
  // was inlined into the host app. We don't use vector search.

  /**
   * Approve a tool call that requires human approval.
   * Saves a `tool-approval-response` message to the thread.
   * After calling this, call `agent.streamText` or `agent.generateText`
   * with `promptMessageId` set to the returned `messageId` to continue
   * generation — the AI SDK will automatically execute the approved tool.
   *
   * The approval response is attached to the same generation order as the
   * original approval request, preserving tool_call/tool_result adjacency in
   * the continuation context even if newer thread messages exist.
   *
   * @param ctx A ctx object from a mutation.
   * @param args.threadId The thread containing the tool call.
   * @param args.approvalId The approval ID from the tool-approval-request part.
   * @param args.reason Optional reason for approval.
   * @returns The messageId of the saved approval response message.
   */
  async approveToolCall(
    ctx: MutationCtx,
    args: { threadId: string; approvalId: string; reason?: string },
  ): Promise<{ messageId: string }> {
    return this.respondToToolCallApproval(ctx, { ...args, approved: true });
  }

  /**
   * Deny a tool call that requires human approval.
   * Saves a `tool-approval-response` message to the thread.
   * After calling this, call `agent.streamText` or `agent.generateText`
   * with `promptMessageId` set to the returned `messageId` to continue
   * generation — the AI SDK will automatically create an `execution-denied`
   * result and let the model respond accordingly.
   *
   * @param ctx A ctx object from a mutation.
   * @param args.threadId The thread containing the tool call.
   * @param args.approvalId The approval ID from the tool-approval-request part.
   * @param args.reason Optional reason for denial.
   * @returns The messageId of the saved denial response message.
   */
  async denyToolCall(
    ctx: MutationCtx,
    args: { threadId: string; approvalId: string; reason?: string },
  ): Promise<{ messageId: string }> {
    return this.respondToToolCallApproval(ctx, { ...args, approved: false });
  }

  private async respondToToolCallApproval(
    ctx: MutationCtx,
    args: {
      threadId: string;
      approvalId: string;
      approved: boolean;
      reason?: string;
    },
  ): Promise<{ messageId: string }> {
    const { promptMessageId, existingResponseMessage } =
      await this.findApprovalContext(ctx, {
        threadId: args.threadId,
        approvalId: args.approvalId,
      });

    const newPart = {
      type: "tool-approval-response" as const,
      approvalId: args.approvalId,
      approved: args.approved,
      reason: args.reason,
    };

    // Merge into an existing approval-response message for this step
    // so the AI SDK sees a single tool message per step.
    if (existingResponseMessage) {
      const existingContent = existingResponseMessage.message?.content;
      const mergedContent = Array.isArray(existingContent)
        ? [...(existingContent as any[]), newPart]
        : [newPart];
      await this.updateMessage(ctx, {
        messageId: existingResponseMessage._id,
        patch: {
          message: { role: "tool", content: mergedContent },
          status: "success",
        },
      });
      return { messageId: existingResponseMessage._id };
    }

    const { messageId } = await this.saveMessage(ctx, {
      threadId: args.threadId,
      promptMessageId,
      message: {
        role: "tool",
        content: [newPart],
      },
    });
    return { messageId };
  }

  private async findApprovalContext(
    ctx: MutationCtx,
    args: { threadId: string; approvalId: string },
  ): Promise<{
    promptMessageId: string;
    existingResponseMessage: MessageDoc | undefined;
  }> {
    // NOTE: This pagination returns messages in descending order (newest first).
    // The "already handled" check (tool-approval-response) relies on seeing
    // responses before their corresponding requests. If the pagination order
    // changes, this logic will need to be updated.
    let existingResponseMessage: MessageDoc | undefined;
    // Limit the search to the most recent messages. Approvals should always
    // be near the end of the thread.
    const page = await this.listMessages(ctx, {
      threadId: args.threadId,
      paginationOpts: { cursor: null, numItems: 100 },
    });
    {
      for (const message of page.page) {
        const content = message.message?.content;
        if (!Array.isArray(content)) continue;
        // Check if this assistant message starts a different approval step.
        // If so, any response message we've seen so far belongs to a newer
        // step — reset it so we don't merge across step boundaries.
        // Only reset if the target approval is NOT in this message (i.e.,
        // this is a genuinely different step, not the same step with
        // multiple tool calls).
        if (
          message.message?.role === "assistant" &&
          content.some(
            (p: any) =>
              p.type === "tool-approval-request" &&
              p.approvalId !== args.approvalId,
          ) &&
          !content.some(
            (p: any) =>
              p.type === "tool-approval-request" &&
              p.approvalId === args.approvalId,
          )
        ) {
          existingResponseMessage = undefined;
        }
        for (const part of content) {
          const typedPart = part as { type?: unknown; approvalId?: unknown };
          if (
            typedPart.type === "tool-approval-response" &&
            typedPart.approvalId === args.approvalId
          ) {
            throw new Error(`Approval ${args.approvalId} was already handled`);
          }
          // Track the most recent tool-approval-response message for merging
          if (
            typedPart.type === "tool-approval-response" &&
            !existingResponseMessage
          ) {
            existingResponseMessage = message;
          }
          if (
            typedPart.type === "tool-approval-request" &&
            typedPart.approvalId === args.approvalId
          ) {
            return { promptMessageId: message._id, existingResponseMessage };
          }
        }
      }
    }

    throw new Error(
      `Approval request ${args.approvalId} was not found in the last 100 messages of thread ${args.threadId}`,
    );
  }

  /**
   * Explicitly save a "step" created by the AI SDK.
   * @param ctx The ctx argument to a mutation or action.
   * @param args The Step generated by the AI SDK.
   */
  async saveStep<TOOLS extends ToolSet>(
    ctx: ActionCtx,
    args: {
      userId?: string;
      threadId: string;
      /**
       * The message this step is in response to.
       */
      promptMessageId: string;
      /**
       * The step to save, possibly including multiple tool calls.
       */
      step: StepResult<TOOLS>;
      /**
       * The model used to generate the step.
       * Defaults to the chat model for the Agent.
       */
      model?: string;
      /**
       * The provider of the model used to generate the step.
       * Defaults to the chat provider for the Agent.
       */
      provider?: string;
    },
  ): Promise<{ messages: MessageDoc[] }> {
    const { messages } = await serializeNewMessagesInStep(
      ctx,
      this.component,
      args.step,
      {
        provider: args.provider ?? getProviderName(this.options.languageModel),
        model: args.model ?? getModelName(this.options.languageModel),
      },
    );
    return ctx.runMutation(this.component.messages.addMessages, {
      userId: args.userId,
      threadId: args.threadId,
      agentName: this.options.name,
      promptMessageId: args.promptMessageId,
      messages,
      failPendingSteps: false,
    });
  }

  /**
   * Manually save the result of a generateObject call to the thread.
   * This happens automatically when using {@link generateObject} or {@link streamObject}
   * from the `thread` object created by {@link continueThread} or {@link createThread}.
   * @param ctx The context passed from the mutation or action function calling this.
   * @param args The arguments to the saveObject function.
   */
  async saveObject(
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
  ): Promise<{ messages: MessageDoc[] }> {
    const { messages } = await serializeObjectResult(
      ctx,
      this.component,
      args.result,
      {
        model:
          args.model ??
          args.metadata?.model ??
          getModelName(this.options.languageModel),
        provider:
          args.provider ??
          args.metadata?.provider ??
          getProviderName(this.options.languageModel),
      },
    );
    return ctx.runMutation(this.component.messages.addMessages, {
      userId: args.userId,
      threadId: args.threadId,
      promptMessageId: args.promptMessageId,
      failPendingSteps: false,
      messages,
      agentName: this.options.name,
    });
  }

  /**
   * Commit or rollback a message that was pending.
   * This is done automatically when saving messages by default.
   * If creating pending messages, you can call this when the full "transaction" is done.
   * @param ctx The ctx argument to your mutation or action.
   * @param args What message to save. Generally the parent message sent into
   *   the generateText call.
   */
  async finalizeMessage(
    ctx: MutationCtx | ActionCtx,
    args: {
      messageId: string;
      result: { status: "failed"; error: string } | { status: "success" };
    },
  ): Promise<void> {
    await ctx.runMutation(this.component.messages.finalizeMessage, {
      messageId: args.messageId,
      result: args.result,
    });
  }

  /**
   * Update a message by its id.
   * @param ctx The ctx argument to your mutation or action.
   * @param args The message fields to update.
   */
  async updateMessage(
    ctx: MutationCtx | ActionCtx,
    args: {
      messageId: string;
      patch: {
        message: ModelMessage | Message;
        status: "success" | "error";
        error?: string;
      };
    },
  ): Promise<void> {
    const { message } = await serializeMessage(
      ctx,
      this.component,
      args.patch.message,
    );
    await ctx.runMutation(this.component.messages.updateMessage, {
      messageId: args.messageId,
      patch: {
        message,
        status: args.patch.status === "success" ? "success" : "failed",
        error: args.patch.error,
      },
    });
  }

  /**
   * Delete multiple messages by their ids, including their embeddings
   * and reduce the refcount of any files they reference.
   * @param ctx The ctx argument to your mutation or action.
   * @param args The ids of the messages to delete.
   */
  async deleteMessages(
    ctx: MutationCtx | ActionCtx,
    args: { messageIds: string[] },
  ): Promise<void> {
    await ctx.runMutation(this.component.messages.deleteByIds, args);
  }

  /**
   * Delete a single message by its id, including its embedding
   * and reduce the refcount of any files it references.
   * @param ctx The ctx argument to your mutation or action.
   * @param args The id of the message to delete.
   */
  async deleteMessage(
    ctx: MutationCtx | ActionCtx,
    args: { messageId: string },
  ): Promise<void> {
    await ctx.runMutation(this.component.messages.deleteByIds, {
      messageIds: [args.messageId],
    });
  }

  /**
   * Delete a range of messages by their order and step order.
   * Each "order" is a set of associated messages in response to the message
   * at stepOrder 0.
   * The (startOrder, startStepOrder) is inclusive
   * and the (endOrder, endStepOrder) is exclusive.
   * To delete all messages at "order" 1, you can pass:
   * `{ startOrder: 1, endOrder: 2 }`
   * To delete a message at step (order=1, stepOrder=1), you can pass:
   * `{ startOrder: 1, startStepOrder: 1, endOrder: 1, endStepOrder: 2 }`
   * To delete all messages between (1, 1) up to and including (3, 5), you can pass:
   * `{ startOrder: 1, startStepOrder: 1, endOrder: 3, endStepOrder: 6 }`
   *
   * If it cannot do it in one transaction, it returns information you can use
   * to resume the deletion.
   * e.g.
   * ```ts
   * let isDone = false;
   * let lastOrder = args.startOrder;
   * let lastStepOrder = args.startStepOrder ?? 0;
   * while (!isDone) {
   *   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   *   ({ isDone, lastOrder, lastStepOrder } = await agent.deleteMessageRange(
   *     ctx,
   *     {
   *       threadId: args.threadId,
   *       startOrder: lastOrder,
   *       startStepOrder: lastStepOrder,
   *       endOrder: args.endOrder,
   *       endStepOrder: args.endStepOrder,
   *     }
   *   ));
   * }
   * ```
   * @param ctx The ctx argument to your mutation or action.
   * @param args The range of messages to delete.
   */
  async deleteMessageRange(
    ctx: MutationCtx | ActionCtx,
    args: {
      threadId: string;
      startOrder: number;
      startStepOrder?: number;
      endOrder: number;
      endStepOrder?: number;
    },
  ): Promise<{ isDone: boolean; lastOrder?: number; lastStepOrder?: number }> {
    return ctx.runMutation(this.component.messages.deleteByOrder, {
      threadId: args.threadId,
      startOrder: args.startOrder,
      startStepOrder: args.startStepOrder,
      endOrder: args.endOrder,
      endStepOrder: args.endStepOrder,
    });
  }

  /**
   * Delete a thread and all its messages and streams asynchronously (in batches)
   * This uses a mutation to that processes one page and recursively queues the
   * next page for deletion.
   * @param ctx The ctx argument to your mutation or action.
   * @param args The id of the thread to delete and optionally the page size to use for the delete.
   */
  async deleteThreadAsync(
    ctx: MutationCtx | ActionCtx,
    args: { threadId: string; pageSize?: number },
  ): Promise<void> {
    await ctx.runMutation(this.component.threads.deleteAllForThreadIdAsync, {
      threadId: args.threadId,
      limit: args.pageSize,
    });
  }

  /**
   * Delete a thread and all its messages and streams synchronously.
   * This uses an action to iterate through all pages. If the action fails
   * partway, it will not automatically restart.
   * @param ctx The ctx argument to your action.
   * @param args The id of the thread to delete and optionally the page size to use for the delete.
   */
  async deleteThreadSync(
    ctx: ActionCtx,
    args: { threadId: string; pageSize?: number },
  ): Promise<void> {
    await ctx.runAction(this.component.threads.deleteAllForThreadIdSync, {
      threadId: args.threadId,
      limit: args.pageSize,
    });
  }

  // The `createThreadMutation`, `asTextAction`, `asObjectAction`, and
  // `asSaveMessagesMutation` workflow helpers were removed when this code
  // was inlined into the host app. They wrap Agent methods as standalone
  // Convex functions for use in the convex `workflow` component, which we
  // don't use. Re-add them if we ever need them.
}
