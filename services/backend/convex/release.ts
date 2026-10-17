import { BREAKING_VERSION } from "../breaking-version";
import { query } from "./_generated/server";

/**
 * Which app versions this deployment works with (see breaking-version.ts).
 * Open apps watch it; a deploy re-runs every live query, so they see a
 * raise the moment it goes live. Public and signed-out, like discovery.
 */
export const breakingVersion = query({
  args: {},
  handler: () => BREAKING_VERSION,
});
