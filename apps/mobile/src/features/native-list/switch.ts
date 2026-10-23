import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { CONTRACT_VERSION, MessageListView, nativeSupport } from "./native";

// Whether conversations use the native message list or the React Native
// one (see .plans/native-message-list.md → Switching to it). Decided in
// JavaScript, so an over-the-air update can flip it either way.

export const NATIVE_LIST = {
  /**
   * Whether it's on for people who haven't chosen. Off until Shawn has
   * tried it in his group chat; an over-the-air update turns it on for
   * everyone.
   */
  byDefault: false,
  /**
   * Whether a binary without it asks to be updated while it's on
   * (`StoreUpdateCover`). Off until a store build with it is out.
   */
  requireBinary: false,
  /**
   * Accounts that see the switch in production builds, where the
   * Developer section is hidden (More → About). Dev builds show it to
   * everyone.
   */
  testers: new Set(["shawn@vera.chat"]),
};

const STORAGE_KEY = "vera.nativeList";

const CHOICES = ["on", "off"] as const;

function load() {
  try {
    const stored = SecureStore.getItem(STORAGE_KEY);
    return CHOICES.find((choice) => choice === stored);
  } catch {
    return undefined;
  }
}

let choice = load();
const listeners = new Set<() => void>();

/** Turns the native list on or off on this device. */
export function setNativeList(on: boolean) {
  choice = on ? "on" : "off";
  SecureStore.setItem(STORAGE_KEY, choice);
  for (const listener of listeners) listener();
}

/** Whether the native list is on here: chosen, or the default. */
export function useNativeListOn() {
  const chosen = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => choice,
  );
  return chosen === undefined ? NATIVE_LIST.byDefault : chosen === "on";
}

/** Whether this binary has a native list this JavaScript can talk to. */
export const nativeListInstalled =
  MessageListView !== null &&
  nativeSupport !== null &&
  nativeSupport.contractVersion === CONTRACT_VERSION;

/** Whether conversations use the native list. */
export function useNativeList() {
  return useNativeListOn() && nativeListInstalled;
}

/**
 * Whether this binary needs a store update to keep going: the native list
 * is on, it's required, and this binary has none.
 */
export function useNeedsNativeListBinary() {
  return (
    useNativeListOn() &&
    NATIVE_LIST.requireBinary &&
    Platform.OS !== "web" &&
    nativeSupport === null
  );
}
