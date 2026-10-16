import type { MenuAction } from "./glass-menu-parts";
import type { MenuTarget } from "./glass-message-menu";
import { canCopy, copyText, selectionTick } from "~/lib/native-extras";
import { linkActions } from "./link-actions";
import { canSaveToPhotos, saveToPhotos } from "./save-media";

/**
 * A held link's actions, Save to Photos for a held photo or video, then
 * Copy for text (the whole message, links and all), and View Reactions
 * once anyone has reacted.
 */
export function menuActions(
  { attachment, link, message }: MenuTarget,
  {
    close,
    onViewReactions,
  }: {
    close: (then?: () => void) => void;
    onViewReactions: () => void;
  },
) {
  const { body } = message;
  const save =
    attachment !== undefined && canSaveToPhotos(attachment)
      ? [
          {
            icon: { android: "download", ios: "square.and.arrow.down" },
            label: "Save to Photos",
            onPress: () => {
              close();
              void saveToPhotos(attachment).then((saved) => {
                if (saved) selectionTick();
              });
            },
          } satisfies MenuAction,
        ]
      : [];
  const copy =
    canCopy && body !== undefined && body !== ""
      ? [
          {
            icon: { android: "content_copy", ios: "doc.on.doc" },
            // Beside Copy Link, say which copy this is.
            label: link === undefined ? "Copy" : "Copy Message",
            onPress: () => {
              copyText(body);
              close();
            },
          } satisfies MenuAction,
        ]
      : [];
  const viewReactions =
    (message.reactions?.length ?? 0) > 0
      ? [
          {
            icon: { android: "groups", ios: "person.2" },
            label: "View Reactions",
            onPress: () => close(onViewReactions),
          } satisfies MenuAction,
        ]
      : [];
  return [...linkActions(link, close), ...save, ...copy, ...viewReactions];
}
