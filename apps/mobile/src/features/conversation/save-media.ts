import { Alert, Linking, Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";
import * as Crypto from "expo-crypto";
import { cacheDirectory, downloadAsync } from "expo-file-system/legacy";

import type { MessageAttachment } from "./types";

// Saving a photo or video to the photo library. The module is loaded
// optionally, so a build made before it was added hides "Save to Photos"
// instead of failing.

interface MediaLibraryModule {
  requestPermissionsAsync: (
    writeOnly: boolean,
    granularPermissions?: readonly string[],
  ) => Promise<{ canAskAgain: boolean; granted: boolean }>;
  saveToLibraryAsync: (localUri: string) => Promise<void>;
}

const mediaLibrary =
  requireOptionalNativeModule<MediaLibraryModule>("ExpoMediaLibrary");

/** File extensions for the types the library takes, by MIME type. */
const EXTENSIONS = new Map([
  ["image/gif", "gif"],
  ["image/heic", "heic"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["video/mp4", "mp4"],
  ["video/quicktime", "mov"],
]);

/** Whether this attachment can go to the photo library from this build. */
export function canSaveToPhotos(attachment: MessageAttachment | undefined) {
  return (
    mediaLibrary !== null &&
    attachment !== undefined &&
    attachment.kind !== "file" &&
    attachment.upload === undefined
  );
}

/** The library needs a local file with an extension. */
function extensionOf(attachment: MessageAttachment) {
  const fromName = /\.([a-z0-9]{2,5})$/i.exec(attachment.name)?.[1];
  if (fromName !== undefined) return fromName.toLowerCase();
  return (
    EXTENSIONS.get(attachment.mimeType) ??
    (attachment.kind === "video" ? "mp4" : "jpg")
  );
}

async function localCopy(attachment: MessageAttachment) {
  if (attachment.localUrl?.startsWith("file:") === true) {
    return attachment.localUrl;
  }
  const path = `${cacheDirectory ?? ""}save-${Crypto.randomUUID()}.${extensionOf(attachment)}`;
  const { status, uri } = await downloadAsync(attachment.url, path);
  if (status < 200 || status >= 300) throw new Error(`Download ${status}`);
  return uri;
}

function askForAccess() {
  Alert.alert(
    "Allow Access to Photos",
    "To save photos and videos, let Vera add to your photo library in Settings.",
    [
      { style: "cancel", text: "Not Now" },
      { onPress: () => void Linking.openSettings(), text: "Open Settings" },
    ],
  );
}

/**
 * Saves a photo or video to the photo library, asking for access to add
 * to it the first time. Reports a failure; success is the haptic tick the
 * caller plays.
 */
export async function saveToPhotos(attachment: MessageAttachment) {
  if (mediaLibrary === null) return false;
  // Add-only access; iOS's native function takes just that flag.
  const permission = await (Platform.OS === "android"
    ? mediaLibrary.requestPermissionsAsync(true, ["photo", "video"])
    : mediaLibrary.requestPermissionsAsync(true));
  if (!permission.granted) {
    if (!permission.canAskAgain) askForAccess();
    return false;
  }
  try {
    await mediaLibrary.saveToLibraryAsync(await localCopy(attachment));
    return true;
  } catch {
    Alert.alert(
      attachment.kind === "video"
        ? "Couldn't Save Video"
        : "Couldn't Save Photo",
      "Check your connection and try again.",
    );
    return false;
  }
}
