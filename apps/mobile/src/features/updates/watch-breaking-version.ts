import { useEffect } from "react";
import { DecentralizedConvexClient } from "@decentralized-convex/client";
import { api } from "@vera/backend/api";

import { useSession } from "~/features/session/session-provider";
import { noteServerBreakingVersion } from "./app-updates";

/**
 * Its own signed-out connection, so the app hears about a breaking deploy
 * before anyone signs in, and with every account signed out.
 */
const transport = new DecentralizedConvexClient();

/**
 * Watches this build's home PDS for its breaking version (see
 * services/backend/breaking-version.ts). A deploy re-runs the query, so a
 * raise arrives the moment the deploy goes live.
 */
export function WatchBreakingVersion() {
  const url = useSession().home.manifest.deploymentUrl;
  // eslint-disable-next-line no-restricted-syntax -- A live subscription that drives the app's update state, not data any screen renders, so it doesn't belong in TanStack Query.
  useEffect(() => {
    const observer = transport.watchQuery({
      args: {},
      combine: (sources) => Math.max(0, ...sources.map(({ data }) => data)),
      query: api.release.breakingVersion,
      targets: [{ id: "home", url }],
    });
    const stop = observer.subscribe(() => {
      noteServerBreakingVersion(observer.getSnapshot().data);
    });
    return () => {
      stop();
      observer.close();
    };
  }, [url]);
  return null;
}
