import { ShardedCounter } from "@convex-dev/sharded-counter";

import { components } from "./_generated/api";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Convex component type
export const counter = new ShardedCounter(components.shardedCounter);
