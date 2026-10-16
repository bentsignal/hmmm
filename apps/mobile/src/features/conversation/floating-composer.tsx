import type { LinkCard } from "@decentralized-convex/messages";
import type { Ref } from "react";
import { useRef, useState } from "react";
import { Alert } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";

import type { ComposerHandle, ReplyingTo } from "./composer";
import type {
  AttachmentSource,
  StagedFile,
} from "~/features/messaging/attachments";
import type { PastedImage } from "~/lib/paste-images";
import {
  MAX_ATTACHMENTS,
  pickAttachments,
  stagePasted,
} from "~/features/messaging/attachments";
import { useLinkPrefetch } from "~/features/messaging/link-previews";
import { Composer, useComposerBottomInset } from "./composer";

/**
 * The composer floating over the bottom of a conversation or thread,
 * holding what's picked for the next message until it's sent. Reports its
 * height so messages can scroll under it.
 */
export function FloatingComposer({
  ref,
  onHeight,
  onSend,
  replyingTo,
  onCancelReply,
  autoFocus,
  placeholder,
}: {
  ref?: Ref<ComposerHandle>;
  onHeight: (height: number) => void;
  onSend: (
    body: string,
    files: readonly StagedFile[],
    linkPreviews: readonly LinkCard[],
  ) => void;
  /** Set while the next message is a reply (see `Composer`). */
  replyingTo?: ReplyingTo;
  onCancelReply?: () => void;
  /** Opens with the keyboard up. */
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const bottomInset = useComposerBottomInset();
  const links = useLinkPrefetch();
  const [staged, setStaged] = useState<readonly StagedFile[]>([]);
  // One picker at a time: a second tap on the menu while one is still
  // handing over files does nothing.
  const picking = useRef(false);

  function full() {
    if (staged.length < MAX_ATTACHMENTS) return false;
    Alert.alert(
      "Too Many Attachments",
      `You can send up to ${MAX_ATTACHMENTS} at a time.`,
    );
    return true;
  }

  function add(files: readonly StagedFile[]) {
    setStaged((current) => [...current, ...files].slice(0, MAX_ATTACHMENTS));
  }

  async function pick(source: AttachmentSource) {
    if (picking.current || full()) return;
    // Nothing shows in the composer until the files are ready; then they
    // animate in.
    picking.current = true;
    const files = await pickAttachments(source, {
      limit: MAX_ATTACHMENTS - staged.length,
    }).finally(() => {
      picking.current = false;
    });
    add(files);
  }

  function paste(images: readonly PastedImage[]) {
    if (full()) return;
    add(stagePasted(images, MAX_ATTACHMENTS - staged.length));
  }

  return (
    <KeyboardStickyView
      // With the keyboard up, the inset below the bar goes behind it.
      offset={{ closed: 0, opened: bottomInset }}
      // Floats over the messages, which scroll all the way to the bottom.
      style={{ bottom: 0, left: 0, position: "absolute", right: 0 }}
      onLayout={(event) => onHeight(event.nativeEvent.layout.height)}
    >
      <Composer
        ref={ref}
        bottomInset={bottomInset}
        staged={staged}
        replyingTo={replyingTo}
        onCancelReply={onCancelReply}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChangeText={links.onChangeText}
        onPick={(source) => void pick(source)}
        onPaste={paste}
        onRemoveStaged={(id) =>
          setStaged((current) => current.filter((file) => file.id !== id))
        }
        onSend={(body) => {
          onSend(body, staged, links.cardsFor(body));
          setStaged([]);
        }}
      />
    </KeyboardStickyView>
  );
}
