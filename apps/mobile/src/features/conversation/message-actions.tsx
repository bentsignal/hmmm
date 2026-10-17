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
import type { LiftMode } from "./row-touch";
import type { Message, MessageAttachment } from "./types";
import { impact } from "~/lib/native-extras";
import { GlassMessageMenu } from "./glass-message-menu";
import { MenuPressContext, reportTouch } from "./row-touch";

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
 * Lifts a whole message, `measured` (the message as it sits in the list)
 * with `preview`, a copy of it: for its tapbacks, which belong to the
 * message rather than one of its parts, and for a hold or double tap
 * beside its parts.
 */
export function useLiftMessage({
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
  return (mode: LiftMode) => {
    lift(open, measured, { align, message, mode, preview, shape });
  };
}

/**
 * The squeeze while something is held, as iOS does: it shrinks a little
 * toward the hold's length, and springs back as it lifts or is let go. Put
 * `style` on what squeezes.
 */
export function useSqueeze() {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return {
    pressIn: () => {
      scale.set(withTiming(PRESS_SCALE, { duration: LONG_PRESS_MS }));
    },
    release: () => {
      scale.set(withSpring(1, RELEASE_SPRING));
    },
    style,
  };
}

/**
 * Makes one part of a message (its text, an attachment, a link card) open
 * the message's glass overlay on a long press, lifting `preview`, a copy of
 * just this part, from where `measured` sits. So a message with several
 * parts never lifts taller than it needs to; reactions picked there go to
 * the whole message. Spread `press` on the Pressable `measured` refers to,
 * and put `style` (the squeeze while held) on the part. `openMenu` opens
 * it as a hold does (a double tap). Null outside a message, as in the
 * lifted copy, where the part draws as is.
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
  const squeeze = useSqueeze();
  if (target === null) return null;
  const { message, align } = target;
  // A message still sending (or that failed) has no menu yet.
  const holdable = message.status === undefined;
  function openMenu() {
    if (!holdable) return;
    impact();
    squeeze.release();
    lift(open, measured, {
      align,
      attachment,
      link,
      message,
      mode: "actions",
      preview,
      shape: shape ?? target?.shape ?? "plain",
    });
  }
  return {
    openMenu,
    press: {
      delayLongPress: LONG_PRESS_MS,
      onLongPress: openMenu,
      onPressIn: () => {
        if (holdable) squeeze.pressIn();
      },
      onPressOut: squeeze.release,
    },
    style: squeeze.style,
  };
}

/**
 * A part of a message that opens its menu on a long press, lifted as is.
 * Its taps are its row's (see `MessageRowTarget`): a double tap opens its
 * menu as a hold does, and in a conversation a single tap opens its
 * thread.
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
  if (target === null) return children;
  const press = {
    ...target.press,
    onPressIn: () => {
      reportTouch({ openMenu: target.openMenu });
      target.press.onPressIn();
    },
  };
  return (
    <Pressable ref={ref} {...press}>
      <MenuPressContext value={press}>
        <Animated.View style={target.style}>{children}</Animated.View>
      </MenuPressContext>
    </Pressable>
  );
}
