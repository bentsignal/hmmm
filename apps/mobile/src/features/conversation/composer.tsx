import { useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput } from "react-native";
import { useReanimatedKeyboardAnimation } from "react-native-keyboard-controller";
import Animated, {
  interpolate,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import type {
  AttachmentSource,
  StagedFile,
} from "~/features/messaging/attachments";
import type { PastedImage } from "~/lib/paste-images";
import { GlassSurface } from "~/components/glass-surface";
import { SymbolIcon } from "~/components/symbol-icon";
import { cn } from "~/lib/cn";
import { PASTE_IMAGES_NATIVE_ID, usePastedImages } from "~/lib/paste-images";
import { AttachMenu } from "./attach-menu";
import { readDraft, writeDraft } from "./drafts";
import { StagedAttachments } from "./staged-attachments";

const StyledTextInput = withUniwind(TextInput);
/** Every control in the composer shares this height so they line up. */
const CONTROL = 40;
const SEND = 32;
/** How long after a send the keyboard may still apply an autocorrection. */
const AUTOCORRECT_WINDOW_MS = 1000;
/**
 * On iOS the controls sit this far from the screen's sides and, on phones
 * with a home indicator, its bottom, like Messages: low and inside the
 * rounded corners.
 */
const IOS_EDGE = 28;
/**
 * While typing on iOS the controls widen to this, a little, moving with the
 * keyboard so the change is barely noticed.
 */
const IOS_TYPING_EDGE = 16;
const ANDROID_EDGE = 12;
/** The bar's padding above and below the controls. */
const PADDING = 8;

/**
 * Space to leave below the composer bar for the home indicator or the
 * navigation bar. On iOS it tucks into the home indicator's inset, so the
 * field ends `IOS_EDGE` from the bottom.
 */
export function useComposerBottomInset() {
  const { bottom } = useSafeAreaInsets();
  if (Platform.OS !== "ios") return bottom;
  return bottom === 0 ? 0 : IOS_EDGE - PADDING;
}

function SendButton({
  visible,
  onPress,
}: {
  visible: boolean;
  onPress: () => void;
}) {
  // Always mounted, so it never pops in below the field or resizes.
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: 120 }),
    transform: [{ scale: withTiming(visible ? 1 : 0.7, { duration: 140 }) }],
  }));
  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        { bottom: (CONTROL - SEND) / 2, position: "absolute", right: 4 },
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send"
        onPress={onPress}
        className="bg-accent items-center justify-center rounded-full active:opacity-80"
        style={{ height: SEND, width: SEND }}
      >
        <SymbolIcon
          name={{ android: "arrow_upward", ios: "arrow.up" }}
          size={15}
          weight="bold"
          tintColorClassName="accent-on-accent"
        />
      </Pressable>
    </Animated.View>
  );
}

/**
 * The message field with its "+" menu and the attachments picked or pasted
 * for the message, which upload only once it's sent. Unsent text is kept as
 * a draft on this device, so it's still there after leaving and coming back.
 */
export function Composer({
  draftKey,
  staged,
  onSend,
  onPick,
  onPaste,
  onRemoveStaged,
  onChangeText,
  bottomInset,
}: {
  /** From `draftKey`: the account and conversation the draft belongs to. */
  draftKey: string;
  staged: readonly StagedFile[];
  /** Sends the text (possibly empty) with everything staged. */
  onSend: (text: string) => void;
  onPick: (source: AttachmentSource) => void;
  /** Photos pasted into the field. */
  onPaste: (images: readonly PastedImage[]) => void;
  onRemoveStaged: (id: string) => void;
  /** Every change to the text, including emptying it on send. */
  onChangeText?: (text: string) => void;
  /** From `useComposerBottomInset`. */
  bottomInset: number;
}) {
  const [draft, setDraft] = useState(() => readDraft(draftKey));
  const input = useRef<TextInput>(null);
  // Only the field being pasted into is focused; another conversation's
  // composer can be mounted beneath this one.
  usePastedImages((images) => {
    if (input.current?.isFocused() === true) onPaste(images);
  });
  /** When the field was last emptied by sending, until something is typed. */
  const sentAt = useRef<number | null>(null);
  const keyboard = useReanimatedKeyboardAnimation();
  const sides = useAnimatedStyle(() => ({
    // eslint-disable-next-line vera/no-layout-animation -- Known: re-lays out the composer on each frame of the keyboard; to be fixed in its own PR.
    paddingHorizontal:
      Platform.OS === "ios"
        ? interpolate(
            keyboard.progress.value,
            [0, 1],
            [IOS_EDGE, IOS_TYPING_EDGE],
          )
        : ANDROID_EDGE,
  }));
  const canSend = draft.trim().length > 0 || staged.length > 0;

  function change(text: string) {
    // Sending while iOS still offers an autocorrection for the last word
    // (tapping send rather than space) lets the keyboard apply it after the
    // field has cleared, putting that word back. Typing adds a letter at a
    // time, so a whole word landing in the empty field just after a send
    // is the keyboard's, and the field stays empty.
    if (
      sentAt.current !== null &&
      text.length > 1 &&
      Date.now() - sentAt.current < AUTOCORRECT_WINDOW_MS
    ) {
      input.current?.clear();
      return;
    }
    if (text !== "") sentAt.current = null;
    setDraft(text);
    writeDraft(draftKey, text);
    onChangeText?.(text);
  }

  function send() {
    if (!canSend) return;
    onSend(draft.trim());
    change("");
    sentAt.current = Date.now();
  }

  return (
    <Animated.View
      className={cn(
        "flex-row items-end gap-2",
        // No glass on Android: a solid bar, down through the navigation
        // bar, keeps messages from showing through behind the field or the
        // system buttons.
        Platform.OS === "android" && "bg-background border-separator",
      )}
      style={[
        {
          paddingBottom: PADDING + bottomInset,
          paddingTop: PADDING,
          ...(Platform.OS === "android" && {
            borderTopWidth: StyleSheet.hairlineWidth,
          }),
        },
        sides,
      ]}
    >
      <AttachMenu onPick={onPick} />
      <GlassSurface
        className="flex-1 justify-center rounded-[20px]"
        style={{ minHeight: CONTROL }}
      >
        <StagedAttachments files={staged} onRemove={onRemoveStaged} />
        <StyledTextInput
          ref={input}
          nativeID={PASTE_IMAGES_NATIVE_ID}
          multiline
          value={draft}
          onChangeText={change}
          placeholder={staged.length > 0 ? "Add a message" : "Message"}
          accessibilityLabel="Message"
          // A message field never needs AutoFill suggestions.
          autoComplete="off"
          textContentType="none"
          className="text-body text-foreground max-h-32 pl-4"
          // The send button floats over this padding, so text never jumps.
          style={{ paddingBottom: 9, paddingRight: SEND + 12, paddingTop: 9 }}
          placeholderTextColorClassName="accent-muted"
          cursorColorClassName="accent-accent"
        />
        <SendButton visible={canSend} onPress={send} />
      </GlassSurface>
    </Animated.View>
  );
}
