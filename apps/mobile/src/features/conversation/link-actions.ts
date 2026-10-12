import { Platform, Share } from "react-native";

import type { MenuAction } from "./glass-menu-parts";
import { canCopy, copyText } from "~/lib/native-extras";
import { openLink } from "~/lib/open-link";

/** Open, copy, and share a held link card's link. */
export function linkActions(
  link: string | undefined,
  close: (then?: () => void) => void,
) {
  if (link === undefined) return [];
  const open = {
    icon: { android: "open_in_browser", ios: "safari" },
    label: "Open Link",
    onPress: () => close(() => openLink(link)),
  } satisfies MenuAction;
  const copy = {
    icon: { android: "link", ios: "link" },
    label: "Copy Link",
    onPress: () => {
      copyText(link);
      close();
    },
  } satisfies MenuAction;
  const share = {
    icon: { android: "share", ios: "square.and.arrow.up" },
    label: "Share…",
    onPress: () =>
      close(
        () =>
          void Share.share(
            // iOS shares a URL as a link; Android only takes text.
            Platform.OS === "ios" ? { url: link } : { message: link },
          ).catch(() => undefined),
      ),
  } satisfies MenuAction;
  return canCopy ? [open, copy, share] : [open, share];
}
