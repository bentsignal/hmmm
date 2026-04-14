import type { AgentComponent } from "./client/types";
import { internal } from "../_generated/api";

/**
 * The "AgentComponent" object used to live as `components.agent` from the
 * `@convex-dev/agent` npm package, which exposed an auto-generated typed
 * surface of all the component's queries/mutations/actions/files.
 *
 * Now that the agent code is inlined directly into this app, the equivalent
 * lives at `internal.agent.*` in our own _generated/api. We re-export it
 * here under the same `AgentComponent` shape so the rest of the inlined
 * client code can keep its existing call sites: `ctx.runQuery(component.X.Y, ...)`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const agentComponent: AgentComponent = internal.agent as any;
