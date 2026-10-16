import * as SecureStore from "expo-secure-store";
import { discoverPds, parsePdsManifest } from "@decentralized-convex/address";
import { assertPdsSupportsApi } from "@decentralized-convex/client";
import { pds } from "@vera/backend/pds";

function storageKey(domain: string) {
  return `vera.home.${domain}`;
}

/**
 * Looks up the home PDS for an account domain through its `_pds` DNS
 * record, checks that it serves every protocol the app uses, and saves it
 * for the next launch (`savedHome`).
 */
export async function discoverHome(domain: string) {
  const home = assertPdsSupportsApi(await discoverPds(domain), pds);
  SecureStore.setItem(
    storageKey(domain),
    JSON.stringify({ manifest: home.manifest, manifestUrl: home.manifestUrl }),
  );
  return home;
}

function fromSaved(domain: string, saved: unknown) {
  if (
    typeof saved !== "object" ||
    saved === null ||
    !("manifest" in saved) ||
    !("manifestUrl" in saved) ||
    typeof saved.manifestUrl !== "string"
  ) {
    return undefined;
  }
  const manifest = parsePdsManifest(saved.manifest);
  if (manifest.accountDomain !== domain) return undefined;
  return assertPdsSupportsApi(
    { domain, manifest, manifestUrl: saved.manifestUrl },
    pds,
  );
}

/**
 * The home PDS found for a domain on an earlier launch, so the app can
 * start before the lookup (two requests) answers again. Undefined when
 * there is none, or when it doesn't serve every protocol this version of
 * the app uses, such as after an update.
 */
export function savedHome(domain: string) {
  try {
    return fromSaved(
      domain,
      JSON.parse(SecureStore.getItem(storageKey(domain)) ?? "null"),
    );
  } catch {
    return undefined;
  }
}
