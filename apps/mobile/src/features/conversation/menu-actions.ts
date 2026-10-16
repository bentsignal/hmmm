import type { MenuAction } from "./glass-menu-parts";
import type { MenuTarget } from "./glass-message-menu";
import { canCopy, copyText, selectionTick } from "~/lib/native-extras";
import { linkActions } from "./link-actions";
import { canSaveToPhotos, saveToPhotos } from "./save-media";

/** Reply, in a conversation (not a thread). */
function replyAction(
  onReply: (() => void) | undefined,
  close: (then?: () => void, toChat?: boolean) => void,
) {
  if (onReply === undefined) return [];
  return [
    {
      icon: { android: "reply", ios: "arrowshape.turn.up.left" },
      label: "Reply",
      // Back to the conversation, where the field takes the reply (or on
      // into the thread, which brings its own keyboard).
      onPress: () => close(onReply, true),
    } satisfies MenuAction,
  ];
}

/**
 * Reply first (in a conversation), then a held link's actions, Save to
 * Photos for a held photo or video, Copy for text (the whole message,
 * links and all), and View Reactions once anyone has reacted.
 */
export function menuActions(
  { attachment, link, message }: MenuTarget,
  {
    close,
    onReply,
    onViewReactions,
  }: {
    /** Closes the menu, then runs `then`; `toChat` keeps the keyboard. */
    close: (then?: () => void, toChat?: boolean) => void;
    onReply?: () => void;
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
  return [
    ...replyAction(onReply, close),
    ...linkActions(link, close),
    ...save,
    ...copy,
    ...viewReactions,
  ];
}
