import { useState } from "react";
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
import { GlassSurface } from "~/components/glass-surface";
import { SymbolIcon } from "~/components/symbol-icon";
import { cn } from "~/lib/cn";
import { AttachMenu } from "./attach-menu";
import { StagedAttachments } from "./staged-attachments";

const StyledTextInput = withUniwind(TextInput);
/** Every control in the composer shares this height so they line up. */
const CONTROL = 40;
const SEND = 32;
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
 * The message field with its "+" menu and the attachments picked for the
 * message, which upload only once it's sent.
 */
export function Composer({
  staged,
  onSend,
  onPick,
  onRemoveStaged,
  onChangeText,
  bottomInset,
}: {
  staged: readonly StagedFile[];
  /** Sends the text (possibly empty) with everything staged. */
  onSend: (text: string) => void;
  onPick: (source: AttachmentSource) => void;
  onRemoveStaged: (id: string) => void;
  /** Every change to the text, including emptying it on send. */
  onChangeText?: (text: string) => void;
  /** From `useComposerBottomInset`. */
  bottomInset: number;
}) {
  const [draft, setDraft] = useState("");
  const keyboard = useReanimatedKeyboardAnimation();
  const sides = useAnimatedStyle(() => ({
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
    setDraft(text);
    onChangeText?.(text);
  }

  function send() {
    if (!canSend) return;
    onSend(draft.trim());
    change("");
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
