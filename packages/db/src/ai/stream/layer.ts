import { Layer } from "effect";

import type { ActionCtx } from "../../_generated/server";
import type { Agent } from "../../../lib/agent-client";
import { agentRuntimeLayer } from "./services/agent_runtime";
import { followUpsLayer } from "./services/follow_ups";
import { threadEventsLayer } from "./services/thread_events";
import { threadStateLayer } from "./services/thread_state";

export function buildLayer(ctx: ActionCtx, agent: Agent) {
  return Layer.mergeAll(
    threadStateLayer(ctx),
    threadEventsLayer(ctx),
    agentRuntimeLayer(ctx, agent),
    followUpsLayer(ctx),
  );
}
