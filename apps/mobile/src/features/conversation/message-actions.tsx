import type { ReactNode, RefObject } from "react";
import type { View as NativeView } from "react-native";
import { createContext, use, useRef, useState } from "react";
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import type {
  MenuTarget,
  PreviewShape,
  TargetAlign,
} from "./glass-message-menu";
import type { Message } from "./types";
import { impact } from "~/lib/native-extras";
import { GlassMessageMenu } from "./glass-message-menu";

interface MessageActions {
  readonly open: (target: MenuTarget) => void;
  readonly toggleReaction: (messageId: string, emoji: string) => void;
  /** Opens who reacted, on the given emoji's tab when there is one. */
  readonly viewReactions: (messageId: string, emoji?: string) => void;
}

const MessageActionsContext = createContext<MessageActions | null>(null);

export function useMessageActions() {
  const actions = use(MessageActionsContext);
  if (actions === null) {
    throw new Error("Messages must render inside MessageActionsProvider");
  }
  return actions;
}

/**
 * Long-press actions for the messages below: the glass reaction overlay,
 * reaction toggles for the chips, and the sheet of who reacted.
 */
export function MessageActionsProvider({
  onToggleReaction,
  onViewReactions,
  onMenuChange,
  children,
}: {
  onToggleReaction: (messageId: string, emoji: string) => void;
  onViewReactions: (messageId: string, emoji?: string) => void;
  /** Called just before the menu opens and as it starts to close. */
  onMenuChange?: () => void;
  children: ReactNode;
}) {
  const [target, setTarget] = useState<MenuTarget | null>(null);
  return (
    <MessageActionsContext
      value={{
        open: (next) => {
          onMenuChange?.();
          setTarget(next);
        },
        toggleReaction: onToggleReaction,
        viewReactions: onViewReactions,
      }}
    >
      {children}
      {target !== null && (
        <GlassMessageMenu
          target={target}
          onReact={(emoji) => onToggleReaction(target.message.id, emoji)}
          onViewReactions={() => onViewReactions(target.message.id)}
          onClosing={onMenuChange}
          onClosed={() => setTarget(null)}
        />
      )}
    </MessageActionsContext>
  );
}

/** Press-and-hold squeezes the held element a little, as iOS does. */
const PRESS_SCALE = 0.96;
export const LONG_PRESS_MS = 320;
const RELEASE_SPRING = { damping: 14, stiffness: 320 };

/** The message whose parts (bubble, link cards) open its menu. */
interface MessageTarget {
  readonly message: Message;
  /** Which side the message sits on; the reaction bar lines up with it. */
  readonly align: TargetAlign;
  /** How its text lifts. */
  readonly shape: PreviewShape;
}

const MessageTargetContext = createContext<MessageTarget | null>(null);

/**
 * A message whose parts open its menu on a long press. Each part makes
 * itself a target (`MenuTargetView`, `useMenuTarget`), so holding one lifts
 * just that part.
 */
export function MessageTargetProvider({
  message,
  align,
  shape,
  children,
}: MessageTarget & { children: ReactNode }) {
  return (
    <MessageTargetContext value={{ align, message, shape }}>
      {children}
    </MessageTargetContext>
  );
}

/**
 * Makes one part of a message (its text, an attachment, a link card) open
 * the message's glass overlay on a long press, lifting `preview`, a copy of
 * just this part, from where `measured` sits. So a message with several
 * parts never lifts taller than it needs to; reactions picked there go to
 * the whole message. Spread `press` on the Pressable `measured` refers to,
 * and put `style` (the squeeze while held) on the part. Null outside a message, as
 * in the lifted copy, where the part draws as is.
 */
export function useMenuTarget({
  measured,
  link,
  shape,
  preview,
}: {
  /** The part's Pressable, measured to lift the copy from where it sits. */
  measured: RefObject<NativeView | null>;
  /** The link of a held card, which the menu is then about. */
  link?: string;
  /** How this part lifts; the message's text shape by default. */
  shape?: PreviewShape;
  preview: ReactNode;
}) {
  const target = use(MessageTargetContext);
  const { open } = useMessageActions();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  if (target === null) return null;
  const { message, align } = target;
  // A message still sending (or that failed) has no menu yet.
  const holdable = message.status === undefined;
  return {
    press: {
      delayLongPress: LONG_PRESS_MS,
      onLongPress: () => {
        if (!holdable) return;
        impact();
        scale.set(withSpring(1, RELEASE_SPRING));
        measured.current?.measureInWindow((x, y, width, height) =>
          open({
            align,
            link,
            message,
            preview,
            rect: { height, width, x, y },
            shape: shape ?? target.shape,
          }),
        );
      },
      onPressIn: () => {
        if (!holdable) return;
        scale.set(withTiming(PRESS_SCALE, { duration: LONG_PRESS_MS }));
      },
      onPressOut: () => {
        scale.set(withSpring(1, RELEASE_SPRING));
      },
    },
    style,
  };
}

/** A part of a message that opens its menu on a long press, lifted as is. */
export function MenuTargetView({
  shape,
  children,
}: {
  /** How this part lifts; the message's text shape by default. */
  shape?: PreviewShape;
  children: ReactNode;
}) {
  const ref = useRef<NativeView>(null);
  const target = useMenuTarget({ measured: ref, preview: children, shape });
  if (target === null) return children;
  return (
    <Pressable ref={ref} {...target.press}>
      <MenuPressContext value={target.press}>
        <Animated.View style={target.style}>{children}</Animated.View>
      </MenuPressContext>
    </Pressable>
  );
}

type MenuPress = NonNullable<ReturnType<typeof useMenuTarget>>["press"];

const MenuPressContext = createContext<MenuPress | null>(null);

/**
 * The hold of the part around it, for a pressable inside it (a link in a
 * message's text), which would otherwise take the hold from the part.
 * Null in the lifted copy.
 */
export function useMenuPress() {
  return use(MenuPressContext);
}
