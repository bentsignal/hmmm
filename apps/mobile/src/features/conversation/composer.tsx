import { useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { withUniwind } from "uniwind";

import type {
  AttachmentSource,
  StagedFile,
} from "~/features/messaging/attachments";
import { GlassSurface } from "~/components/glass-surface";
import { SymbolIcon } from "~/components/symbol-icon";
import { cn } from "~/lib/cn";
import { AttachMenu } from "./attach-menu";
import { StagedAttachments } from "./staged-attachments";

const StyledTextInput = withUniwind(TextInput);
/** Every control in the composer shares this height so they line up. */
const CONTROL = 40;
const SEND = 32;
/** How long after a send the keyboard may still apply an autocorrection. */
const AUTOCORRECT_WINDOW_MS = 1000;

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
 * The message field with its "+" menu and the attachments picked for the
 * message, which upload only once it's sent.
 */
export function Composer({
  staged,
  onSend,
  onPick,
  onRemoveStaged,
  onChangeText,
}: {
  staged: readonly StagedFile[];
  /** Sends the text (possibly empty) with everything staged. */
  onSend: (text: string) => void;
  onPick: (source: AttachmentSource) => void;
  onRemoveStaged: (id: string) => void;
  /** Every change to the text, including emptying it on send. */
  onChangeText?: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const input = useRef<TextInput>(null);
  /** When the field was last emptied by sending, until something is typed. */
  const sentAt = useRef<number | null>(null);
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
    onChangeText?.(text);
  }

  function send() {
    if (!canSend) return;
    onSend(draft.trim());
    change("");
    sentAt.current = Date.now();
  }

  return (
    <View
      className={cn(
        "flex-row items-end gap-2 px-3 pt-2 pb-2",
        // No glass on Android: a solid bar keeps messages from showing
        // through behind the field.
        Platform.OS === "android" && "bg-background border-separator",
      )}
      style={
        Platform.OS === "android"
          ? { borderTopWidth: StyleSheet.hairlineWidth }
          : undefined
      }
    >
      <AttachMenu onPick={onPick} />
      <GlassSurface
        className="flex-1 justify-center rounded-[20px]"
        style={{ minHeight: CONTROL }}
      >
        <StagedAttachments files={staged} onRemove={onRemoveStaged} />
        <StyledTextInput
          ref={input}
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
    </View>
  );
}
