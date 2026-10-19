import { View } from "react-native";

import type { MediaItem } from "./media-groups";
import { CountBadge, PileCard } from "./bubble-cards";
import { behind, CARD_WIDTH, cardHeight } from "./bubble-layout";

// Bubbles' piles of photos that sit still (see `BubbleMediaStack`).

/** How far each card behind rises past the one in front (`Depth`). */
const RISE = 14;

/**
 * `fan`: the cards behind tilt out from under the front one, like a hand
 * of photos, softly blurred and faded into the conversation.
 */
export function Fan({
  items,
  isOwn,
}: {
  items: readonly MediaItem[];
  isOwn: boolean;
}) {
  const [front] = items;
  if (front === undefined) return null;
  const height = cardHeight(front.attachment);
  // Toward the middle of the screen.
  const side = isOwn ? -1 : 1;
  return (
    <View style={{ height: height + 18, width: CARD_WIDTH + 30 }}>
      {behind(items, 0)
        .map((item, depth) => (
          <View
            key={item.index}
            className="absolute"
            style={{
              left: isOwn ? 30 : 0,
              top: 9,
              transform: [
                { translateX: side * (depth + 1) * 13 },
                { rotate: `${side * (depth + 1) * 6}deg` },
                { scale: 1 - (depth + 1) * 0.04 },
              ],
            }}
          >
            <PileCard
              item={item}
              width={CARD_WIDTH}
              height={height}
              blur={6 + depth * 4}
              dim={0.18 + depth * 0.12}
              front={false}
            />
          </View>
        ))
        .reverse()}
      <View className="absolute" style={{ left: isOwn ? 30 : 0, top: 9 }}>
        <PileCard
          item={front}
          width={CARD_WIDTH}
          height={height}
          blur={0}
          dim={0}
          front
        />
        <CountBadge count={items.length} isOwn={isOwn} />
      </View>
    </View>
  );
}

/**
 * `peek`: the cards behind slide out to the side toward the middle of the
 * screen, each smaller, blurrier, and further back than the last.
 */
export function Peek({
  items,
  isOwn,
}: {
  items: readonly MediaItem[];
  isOwn: boolean;
}) {
  const [front] = items;
  if (front === undefined) return null;
  const height = cardHeight(front.attachment);
  const back = behind(items, 0);
  const reach = back.length * 26;
  return (
    <View style={{ height, width: CARD_WIDTH + reach }}>
      {back
        .map((item, depth) => {
          const scale = 1 - (depth + 1) * 0.1;
          const shift = (depth + 1) * 26 + (CARD_WIDTH * (1 - scale)) / 2;
          return (
            <View
              key={item.index}
              className="absolute top-0"
              style={[
                isOwn ? { right: 0 } : { left: 0 },
                {
                  transform: [
                    { translateX: (isOwn ? -1 : 1) * shift },
                    { scale },
                  ],
                },
              ]}
            >
              <PileCard
                item={item}
                width={CARD_WIDTH}
                height={height}
                blur={8 + depth * 6}
                dim={0.25 + depth * 0.2}
                front={false}
              />
            </View>
          );
        })
        .reverse()}
      <View
        className="absolute top-0"
        style={isOwn ? { right: 0 } : { left: 0 }}
      >
        <PileCard
          item={front}
          width={CARD_WIDTH}
          height={height}
          blur={0}
          dim={0}
          front
        />
        <CountBadge count={items.length} isOwn={isOwn} />
      </View>
    </View>
  );
}

/**
 * `depth`: stacked like notifications, the cards behind rising above the
 * front one's top edge, narrower and blurrier the further back they sit.
 */
export function Depth({
  items,
  isOwn,
}: {
  items: readonly MediaItem[];
  isOwn: boolean;
}) {
  const [front] = items;
  if (front === undefined) return null;
  const height = cardHeight(front.attachment);
  const back = behind(items, 0);
  const rise = back.length * RISE;
  return (
    <View style={{ height: height + rise, width: CARD_WIDTH }}>
      {back
        .map((item, depth) => (
          <View
            key={item.index}
            className="absolute left-0"
            style={{
              top: rise - (depth + 1) * RISE,
              transform: [{ scaleX: 1 - (depth + 1) * 0.08 }],
            }}
          >
            <PileCard
              item={item}
              width={CARD_WIDTH}
              height={height}
              blur={10 + depth * 6}
              dim={0.2 + depth * 0.2}
              front={false}
            />
          </View>
        ))
        .reverse()}
      <View className="absolute left-0" style={{ top: rise }}>
        <PileCard
          item={front}
          width={CARD_WIDTH}
          height={height}
          blur={0}
          dim={0}
          front
        />
        <CountBadge count={items.length} isOwn={isOwn} />
      </View>
    </View>
  );
}
