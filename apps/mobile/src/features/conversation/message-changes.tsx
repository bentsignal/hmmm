import { Text, View } from "react-native";
import Animated, { FadeIn, useAnimatedRef } from "react-native-reanimated";

import type { Message } from "./types";
import { cn } from "~/lib/cn";
import { BUBBLE_RADIUS } from "./bubble-shape";
import { GrowingSpace, useChangedSinceMount } from "./grow";
import { BUBBLE_COLUMN_GAP } from "./row-header";
import { useRowOrder } from "./row-order";
import { Place } from "./row-place";

// What a message shows of being changed after it was sent: edited, or
// deleted while its thread had replies (any other deleted message is gone).

const DELETED_TEXT = "This message was deleted";

/**
 * Where a deleted thread original was, in its bubble's place: an outline
 * of a bubble, so its thread's count under it still has something to
 * belong to.
 */
export function DeletedBubble() {
  return (
    <View
      className="border-separator border px-3.5 py-2"
      style={{ borderRadius: BUBBLE_RADIUS }}
    >
      <Text className="text-body text-muted leading-[22px] italic">
        {DELETED_TEXT}
      </Text>
    </View>
  );
}

/** Where a deleted thread original was, in a stacked row. */
export function DeletedText() {
  return <Text className="text-body text-muted italic">{DELETED_TEXT}</Text>;
}

/** The "Edited" line's height, fixed so its space can open before it. */
const EDITED_LINE = 16;
const SHOW = FadeIn.duration(220);

function EditedText({ isOwn }: { isOwn: boolean }) {
  return (
    <Text
      className={cn("text-caption text-muted px-1", isOwn && "text-right")}
      style={{ lineHeight: EDITED_LINE }}
    >
      Edited
    </Text>
  );
}

/**
 * "Edited" under an edited bubble, on its side. Edited while you watch,
 * its line opens as reactions' space does (see `GrowingSpace`): the
 * bubble and everything above move up into place, and the label fades in.
 */
export function EditedLabel({
  message,
  isOwn,
}: {
  message: Message;
  isOwn: boolean;
}) {
  const edited = message.editedAt !== undefined;
  const late = useChangedSinceMount(edited);
  if (!edited) return null;
  if (!late) return <EditedText isOwn={isOwn} />;
  return <LateEdited message={message} isOwn={isOwn} />;
}

/** "Edited" as it opens, for a message edited while you watch. */
function LateEdited({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const order = useRowOrder(message);
  const measured = useAnimatedRef<View>();
  return (
    <Animated.View ref={measured} style={{ marginTop: -BUBBLE_COLUMN_GAP }}>
      <GrowingSpace
        height={EDITED_LINE + BUBBLE_COLUMN_GAP}
        order={order}
        place={Place.bottom}
        animate
        measured={measured}
      >
        <Animated.View entering={SHOW} style={{ marginTop: BUBBLE_COLUMN_GAP }}>
          <EditedText isOwn={isOwn} />
        </Animated.View>
      </GrowingSpace>
    </Animated.View>
  );
}

/**
 * "(edited)" after an edited message's text in a stacked row, inside the
 * text so it follows its last line.
 */
export function EditedSuffix() {
  return <Text className="text-caption text-muted"> (edited)</Text>;
}
