import { useEffect } from "react";
import { AppState } from "react-native";
import { File, Paths } from "expo-file-system";
import { useNavigationContainerRef } from "expo-router";
import * as Updates from "expo-updates";
import { Uniwind } from "uniwind";

import { saveDraftsNow } from "~/features/conversation/drafts";
import { hasUnsentMessages } from "~/features/messaging/outbox";
import { queryClient } from "~/features/session/account-session";
import { canRestartForUpdate } from "./restart-policy";

// Over-the-air updates go in as the app opens, so nobody keeps running old
// code against a newer backend. Every launch and every return from the
// background checks for one and downloads it, showing nothing. When it's
// ready while the app is still opening (`OPEN_WINDOW_MS`), the app restarts
// into it behind a screen like the splash and reopens on the same screen. A
// slower download waits for the next open, or the next launch, which starts
// on the newest downloaded update by itself.

type NavigationRef = ReturnType<typeof useNavigationContainerRef>;
type RootState = NonNullable<Parameters<NavigationRef["resetRoot"]>[0]>;

/** A screen saved longer ago than this belongs to some other restart. */
const RESTORE_WITHIN_MS = 30_000;
/** How long to wait for the navigator to mount before giving up on it. */
const RESTORE_FRAMES = 60;

let openedAt = Date.now();
let checking = false;
let downloaded = false;
let navigation: NavigationRef | undefined;

/** Checks for updates on launch and on every return from the background. */
export function installAppUpdates() {
  if (__DEV__ || !Updates.isEnabled) return;
  // "inactive" (Control Center, Face ID, a system alert) isn't an open; only
  // coming back from the background is. A launch in the background, as for a
  // notification, waits for the app to open too.
  let wasInBackground = AppState.currentState === "background";
  AppState.addEventListener("change", (state) => {
    if (state === "background") wasInBackground = true;
    if (state !== "active" || !wasInBackground) return;
    wasInBackground = false;
    void onOpen();
  });
  if (!wasInBackground) void onOpen();
}

async function onOpen() {
  openedAt = Date.now();
  if (!downloaded) {
    if (checking) return;
    checking = true;
    // Offline, or the update server is down: the next open tries again.
    downloaded = await download().catch(() => false);
    checking = false;
  }
  if (downloaded) await restartIfUnnoticed();
}

/** Downloads a newer update, if there is one. */
async function download() {
  // At launch this waits for the update the native side is already
  // downloading, then finds it on disk.
  const check = await Updates.checkForUpdateAsync();
  if (!check.isAvailable && !check.isRollBackToEmbedded) return false;
  const fetched = await Updates.fetchUpdateAsync();
  return fetched.isNew || fetched.isRollBackToEmbedded;
}

async function restartIfUnnoticed() {
  const now = Date.now();
  const ready = canRestartForUpdate({
    active: AppState.currentState === "active",
    now,
    openedAt,
    pendingMutations: queryClient.isMutating(),
    unsentMessages: hasUnsentMessages(),
  });
  if (!ready) return;
  saveDraftsNow();
  saveScreen(now);
  try {
    await Updates.reloadAsync({
      reloadScreenOptions: {
        // The splash's colors, so the restart looks like the app opening.
        backgroundColor:
          Uniwind.currentTheme === "dark" ? "#000000" : "#FFFFFF",
        fade: true,
        spinner: { enabled: false },
      },
    });
  } catch {
    // The update goes in on the next launch instead.
    forgetScreen();
  }
}

function screenFile() {
  return new File(Paths.cache, "screen-before-update.json");
}

function forgetScreen() {
  try {
    screenFile().delete();
  } catch {
    // Never saved.
  }
}

interface Navigated {
  readonly index?: number;
  readonly routes: readonly {
    readonly name: string;
    readonly params?: object;
    readonly state?: Navigated;
  }[];
}

/**
 * Only the screens' names and params. Restoring this partial state rebuilds
 * each navigator, which drops any screen the update renamed or removed.
 */
function partialState(state: Navigated): Navigated {
  return {
    index: state.index,
    routes: state.routes.map((route) => ({
      name: route.name,
      params: route.params,
      state: route.state && partialState(route.state),
    })),
  };
}

function saveScreen(now: number) {
  if (navigation?.isReady() !== true) return;
  try {
    const state = partialState(navigation.getRootState());
    screenFile().write(JSON.stringify({ savedAt: now, state }));
  } catch {
    // The app reopens on Home instead.
  }
}

function isRootState(value: unknown): value is RootState {
  return (
    typeof value === "object" &&
    value !== null &&
    "routes" in value &&
    Array.isArray(value.routes)
  );
}

/** A saved screen, if it's from the restart that started this launch. */
function recentScreen(saved: unknown) {
  if (typeof saved !== "object" || saved === null) return undefined;
  if (!("savedAt" in saved) || !("state" in saved)) return undefined;
  const { savedAt, state } = saved;
  if (typeof savedAt !== "number" || !isRootState(state)) return undefined;
  return Date.now() - savedAt <= RESTORE_WITHIN_MS ? state : undefined;
}

/** The screen the app was on before restarting into an update, read once. */
function takeSavedScreen() {
  const file = screenFile();
  if (!file.exists) return undefined;
  try {
    const text = file.textSync();
    forgetScreen();
    return recentScreen(JSON.parse(text));
  } catch {
    forgetScreen();
    return undefined;
  }
}

/**
 * Lets an update restart save which screen is open, and reopens the screen
 * saved by the restart that started this launch. Returns the cleanup.
 */
function attachNavigation(ref: NavigationRef) {
  navigation = ref;
  const saved = takeSavedScreen();
  let frame: number | undefined;
  let framesLeft = RESTORE_FRAMES;
  function restore() {
    if (saved === undefined) return;
    if (ref.isReady()) {
      ref.resetRoot(saved);
      return;
    }
    framesLeft -= 1;
    if (framesLeft > 0) frame = requestAnimationFrame(restore);
  }
  restore();
  return () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
    if (navigation === ref) navigation = undefined;
  };
}

/** Connects update restarts to the app's navigation. */
export function UpdateNavigation() {
  const ref = useNavigationContainerRef();
  // eslint-disable-next-line no-restricted-syntax -- The navigation container lives outside React's data flow: restarts read its state, and the screen saved before one is restored into it once.
  useEffect(() => attachNavigation(ref), [ref]);
  return null;
}
