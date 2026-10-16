import type { ReactNode, RefObject } from "react";
import type { View as NativeView } from "react-native";
import { createContext, use, useRef, useState } from "react";
import { Pressable } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
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
import type { Message, MessageAttachment } from "./types";
import { impact, selectionTick } from "~/lib/native-extras";
import { GlassMessageMenu } from "./glass-message-menu";

interface MessageActions {
  readonly open: (target: MenuTarget) => void;
  /**
   * Opens a message's thread (a reply's own). Absent in a thread, where a
   * tap does nothing.
   */
  readonly openThread?: (message: Message) => void;
  readonly toggleReaction: (messageId: string, emoji: string) => void;
  /** Opens who reacted, on the given emoji's tab when there is one. */
  readonly viewReactions: (messageId: string, emoji?: string) => void;
}

const MessageActionsContext = createContext<MessageActions | null>(null);

/** The message lifted into the menu, from when it opens until it's closed. */
const LiftedMessageContext = createContext<string | undefined>(undefined);

/** Whether this message is lifted into the menu right now. */
export function useIsLifted(messageId: string) {
  return use(LiftedMessageContext) === messageId;
}

export function useMessageActions() {
  const actions = use(MessageActionsContext);
  if (actions === null) {
    throw new Error("Messages must render inside MessageActionsProvider");
  }
  return actions;
}

/**
 * Long-press actions for the messages below: the glass reaction overlay,
 * reaction toggles for the chips, the sheet of who reacted, and in a
 * conversation, replies and threads.
 */
export function MessageActionsProvider({
  onToggleReaction,
  onViewReactions,
  onOpenThread,
  onReply,
  menuKeyboard,
  children,
}: {
  onToggleReaction: (messageId: string, emoji: string) => void;
  onViewReactions: (messageId: string, emoji?: string) => void;
  /** A tap on a message opens its thread; absent in a thread. */
  onOpenThread?: (message: Message) => void;
  /** The menu's Reply; absent in a thread. */
  onReply?: (message: Message) => void;
  /** What the keyboard does around the menu (see `useMenuKeyboard`). */
  menuKeyboard?: {
    onOpen: () => void;
    onClosing: () => void;
    onClosed: (backToChat: boolean) => void;
  };
  children: ReactNode;
}) {
  const [target, setTarget] = useState<MenuTarget | null>(null);
  return (
    <MessageActionsContext
      value={{
        open: (next) => {
          menuKeyboard?.onOpen();
          setTarget(next);
        },
        openThread: onOpenThread,
        toggleReaction: onToggleReaction,
        viewReactions: onViewReactions,
      }}
    >
      <LiftedMessageContext value={target?.message.id}>
        {children}
      </LiftedMessageContext>
      {target !== null && (
        <GlassMessageMenu
          target={target}
          onReact={(emoji) => onToggleReaction(target.message.id, emoji)}
          onViewReactions={(emoji) => onViewReactions(target.message.id, emoji)}
          onReply={
            onReply === undefined ? undefined : () => onReply(target.message)
          }
          onClosing={menuKeyboard?.onClosing}
          onClosed={(backToChat) => {
            setTarget(null);
            menuKeyboard?.onClosed(backToChat);
          }}
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
 * Two taps this close together are a double tap. A single tap waits this
 * long to be sure it isn't one.
 */
const DOUBLE_TAP_MS = 200;
/** A tap moving further than this is a drag (to reveal times), not a tap. */
const TAP_SLOP = 10;
/** How long a link's tap keeps the message's tap from opening its thread. */
const LINK_TAP_MS = 600;

/** What a part of a message lifts into the menu, besides where it sits. */
type LiftedPart = Omit<MenuTarget, "rect">;

/** Lifts `measured` into the menu from where it sits on screen. */
function lift(
  open: (target: MenuTarget) => void,
  measured: RefObject<NativeView | null>,
  part: LiftedPart,
) {
  measured.current?.measureInWindow((x, y, width, height) =>
    open({ ...part, rect: { height, width, x, y } }),
  );
}

/**
 * Opens a whole message's reactions, lifting `measured` (the message as it
 * sits in the list) with `preview`, a copy of it. For the tapbacks, which
 * belong to the message rather than one of its parts.
 */
export function useOpenReactions({
  message,
  align,
  shape,
  measured,
  preview,
}: MessageTarget & {
  measured: RefObject<NativeView | null>;
  preview: ReactNode;
}) {
  const { open } = useMessageActions();
  return () => {
    selectionTick();
    lift(open, measured, { align, message, mode: "reactions", preview, shape });
  };
}

/**
 * Makes one part of a message (its text, an attachment, a link card) open
 * the message's glass overlay on a long press, lifting `preview`, a copy of
 * just this part, from where `measured` sits. So a message with several
 * parts never lifts taller than it needs to; reactions picked there go to
 * the whole message. Spread `press` on the Pressable `measured` refers to,
 * and put `style` (the squeeze while held) on the part. `openReactions`
 * lifts it with who reacted instead of the actions (a double tap). Null
 * outside a message, as in the lifted copy, where the part draws as is.
 */
export function useMenuTarget({
  measured,
  link,
  attachment,
  shape,
  preview,
}: {
  /** The part's Pressable, measured to lift the copy from where it sits. */
  measured: RefObject<NativeView | null>;
  /** The link of a held card, which the menu is then about. */
  link?: string;
  /** A held photo, video, or file, which the menu can save. */
  attachment?: MessageAttachment;
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
  function openAs(mode: MenuTarget["mode"]) {
    lift(open, measured, {
      align,
      attachment,
      link,
      message,
      mode,
      preview,
      shape: shape ?? target?.shape ?? "plain",
    });
  }
  return {
    press: {
      delayLongPress: LONG_PRESS_MS,
      onLongPress: () => {
        if (!holdable) return;
        impact();
        scale.set(withSpring(1, RELEASE_SPRING));
        openAs("actions");
      },
      onPressIn: () => {
        if (!holdable) return;
        scale.set(withTiming(PRESS_SCALE, { duration: LONG_PRESS_MS }));
      },
      onPressOut: () => {
        scale.set(withSpring(1, RELEASE_SPRING));
      },
    },
    /** Lifts the part with who reacted, as a double tap does. */
    openReactions: () => {
      if (!holdable) return;
      selectionTick();
      openAs("reactions");
    },
    style,
  };
}

/**
 * A part of a message that opens its menu on a long press, its reactions
 * on a double tap, and in a conversation its thread on a single tap,
 * lifted as is. The taps are the native recognizers': a Pressable drops
 * the second of two quick taps. A single tap fires once a double tap can
 * no longer begin.
 */
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
  const messageTarget = use(MessageTargetContext);
  const { openThread } = useMessageActions();
  // When a link in the text took the last tap, which then isn't the
  // message's.
  const linkTappedAt = useRef(0);
  if (target === null || messageTarget === null) return children;
  const { message } = messageTarget;
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(DOUBLE_TAP_MS)
    .runOnJS(true)
    .onEnd((_, success) => {
      if (success) target.openReactions();
    });
  const singleTap = Gesture.Tap()
    // A hold opens the menu instead.
    .maxDuration(LONG_PRESS_MS)
    .maxDistance(TAP_SLOP)
    .enabled(openThread !== undefined && message.status === undefined)
    .runOnJS(true)
    .onEnd((_, success) => {
      if (!success || Date.now() - linkTappedAt.current < LINK_TAP_MS) return;
      openThread?.(message);
    });
  return (
    <GestureDetector gesture={Gesture.Exclusive(doubleTap, singleTap)}>
      <Pressable ref={ref} {...target.press}>
        <MenuPressContext value={target.press}>
          <LinkTapContext
            value={() => {
              linkTappedAt.current = Date.now();
            }}
          >
            <Animated.View style={target.style}>{children}</Animated.View>
          </LinkTapContext>
        </MenuPressContext>
      </Pressable>
    </GestureDetector>
  );
}

const LinkTapContext = createContext<(() => void) | null>(null);

/**
 * Tells the part around it that a link inside took the tap, so the tap
 * doesn't also open the message's thread. Null in the lifted copy.
 */
export function useLinkTap() {
  return use(LinkTapContext);
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
