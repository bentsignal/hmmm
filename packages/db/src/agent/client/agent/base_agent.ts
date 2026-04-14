import type {
  GenerateObjectResult,
  LanguageModel,
  StepResult,
  ToolSet,
} from "ai";
import type { PaginationOptions } from "convex/server";

import type {
  MessageStatus,
  MessageWithMetadata,
  StreamArgs,
  ThreadDoc,
} from "../../validators";
import type { SaveMessageArgs, SaveMessagesArgs } from "../messages";
import type {
  ActionCtx,
  AgentComponent,
  Config,
  MutationCtx,
  QueryCtx,
} from "../types";
import { listMessages, saveMessage, saveMessages } from "../messages";
import { syncStreams } from "../streaming";
import { getThreadMetadata } from "../threads";
import { agentApproveToolCall, agentDenyToolCall } from "./approvals";
import {
  agentDeleteMessage,
  agentDeleteMessageRange,
  agentDeleteMessages,
  agentFinalizeMessage,
  agentSaveObject,
  agentSaveStep,
  agentUpdateMessage,
} from "./message_ops";

type AnyCtx = MutationCtx | ActionCtx;

interface ApprovalArgs {
  threadId: string;
  approvalId: string;
  reason?: string;
}

export abstract class AgentBase {
  abstract component: AgentComponent;
  abstract options: Config & { name: string; languageModel: LanguageModel };

  async saveMessage(ctx: AnyCtx, args: SaveMessageArgs) {
    return saveMessage(ctx, this.component, {
      ...args,
      agentName: this.options.name,
    });
  }

  async saveMessages(ctx: AnyCtx, args: SaveMessagesArgs) {
    return saveMessages(ctx, this.component, {
      ...args,
      agentName: this.options.name,
    });
  }

  async listMessages(
    ctx: QueryCtx | AnyCtx,
    args: {
      threadId: string;
      paginationOpts: PaginationOptions;
      excludeToolMessages?: boolean;
      statuses?: MessageStatus[];
    },
  ) {
    return listMessages(ctx, this.component, args);
  }

  async syncStreams(
    ctx: QueryCtx | AnyCtx,
    args: {
      threadId: string;
      streamArgs: StreamArgs | undefined;
      includeStatuses?: ("streaming" | "finished" | "aborted")[];
    },
  ) {
    return syncStreams(ctx, this.component, args);
  }

  async getThreadMetadata(ctx: QueryCtx | AnyCtx, args: { threadId: string }) {
    return getThreadMetadata(ctx, this.component, args);
  }

  async updateThreadMetadata(
    ctx: AnyCtx,
    args: {
      threadId: string;
      patch: Partial<
        Pick<ThreadDoc, "title" | "summary" | "status" | "userId">
      >;
    },
  ) {
    return ctx.runMutation(this.component.threads.updateThread, args);
  }

  async approveToolCall(ctx: MutationCtx, args: ApprovalArgs) {
    return agentApproveToolCall(this.component, this.options.name, ctx, args);
  }

  async denyToolCall(ctx: MutationCtx, args: ApprovalArgs) {
    return agentDenyToolCall(this.component, this.options.name, ctx, args);
  }

  async saveStep<TOOLS extends ToolSet>(
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
    return agentSaveStep<TOOLS>(this.component, this.options, ctx, args);
  }

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
  ) {
    return agentSaveObject(this.component, this.options, ctx, args);
  }

  async finalizeMessage(
    ctx: AnyCtx,
    args: {
      messageId: string;
      result: { status: "failed"; error: string } | { status: "success" };
    },
  ) {
    await agentFinalizeMessage(this.component, ctx, args);
  }

  async updateMessage(
    ctx: AnyCtx,
    args: Parameters<typeof agentUpdateMessage>[2],
  ) {
    await agentUpdateMessage(this.component, ctx, args);
  }

  async deleteMessages(ctx: AnyCtx, args: { messageIds: string[] }) {
    await agentDeleteMessages(this.component, ctx, args);
  }

  async deleteMessage(ctx: AnyCtx, args: { messageId: string }) {
    await agentDeleteMessage(this.component, ctx, args);
  }

  async deleteMessageRange(
    ctx: AnyCtx,
    args: {
      threadId: string;
      startOrder: number;
      startStepOrder?: number;
      endOrder: number;
      endStepOrder?: number;
    },
  ) {
    return agentDeleteMessageRange(this.component, ctx, args);
  }

  async deleteThreadAsync(
    ctx: AnyCtx,
    args: { threadId: string; pageSize?: number },
  ) {
    await ctx.runMutation(this.component.threads.deleteAllForThreadIdAsync, {
      threadId: args.threadId,
      limit: args.pageSize,
    });
  }

  async deleteThreadSync(
    ctx: ActionCtx,
    args: { threadId: string; pageSize?: number },
  ) {
    await ctx.runAction(this.component.threads.deleteAllForThreadIdSync, {
      threadId: args.threadId,
      limit: args.pageSize,
    });
  }
}
