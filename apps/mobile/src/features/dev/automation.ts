import type { Href } from "expo-router";
import { DevSettings } from "react-native";
import { router } from "expo-router";

import type { Preferences } from "~/features/preferences/store";
import { env } from "~/env";
import { setPreference } from "~/features/preferences/store";
import { storedAccounts } from "~/features/session/account-store";
import { benchApi } from "./bench/bench-api";
import { devConversation } from "./dev-conversation";
import { devSignInPath } from "./dev-sign-in-path";
import { frameReport, startFrames, stopFrames } from "./frames";

function isAppPath(path: string): path is Href & string {
  return path.startsWith("/");
}

/**
 * Debug builds on a dev PDS only: lets `scripts/sim.sh open` move around
 * the app over Metro's debugger connection. iOS asks "Open in Vera?" before
 * every `simctl openurl`, which scripts cannot answer.
 */
export function installDevAutomation() {
  if ((!__DEV__ && !env.profileBundle) || !env.devTools) return;
  Object.assign(globalThis, {
    veraDev: {
      open(path: string) {
        if (!path.startsWith("/")) throw new Error(`Not an app path: ${path}`);
        const target = devSignInPath(path, storedAccounts().length > 0);
        if (isAppPath(target)) router.push(target);
      },
      reload() {
        DevSettings.reload();
      },
      /** Sets a preference, such as `groupLayout`, without the settings. */
      preference<Key extends keyof Preferences>(
        key: Key,
        value: Preferences[Key],
      ) {
        setPreference(key, value);
      },
      /** The open conversation, to react and send without tapping. */
      conversation: devConversation,
      /** The open list benchmark (see features/dev/bench). */
      bench: benchApi,
      /** `scripts/sim.sh frames start` and `stop`: see frames.ts. */
      frames: { report: frameReport, start: startFrames, stop: stopFrames },
    },
  });
}
