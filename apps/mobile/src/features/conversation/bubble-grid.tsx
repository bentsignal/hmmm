import { Pressable, Text, View } from "react-native";

import type { MediaItem } from "./media-groups";
import type { Message } from "./types";
import { PlayBadge } from "./attachment-view";
import { Poster } from "./bubble-cards";
import { CARD_WIDTH } from "./bubble-layout";
import { useOpenGallery } from "./media-gallery";

/** The tiles' gap, and how many it shows before "+N". */
const GRID_GAP = 2;
const GRID_MAX = 4;

/** One tile of the grid, which opens the focused view on it. */
function GridTile({
  message,
  item,
  width,
  height,
  more,
}: {
  message: Message;
  item: MediaItem;
  width: number;
  height: number;
  /** How many more there are past this, the last tile shown. */
  more: number;
}) {
  const openGallery = useOpenGallery();
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={item.attachment.kind === "video" ? "Video" : "Photo"}
      onPress={() => openGallery?.(message.id, item.index)}
    >
      <View
        className="bg-fill items-center justify-center overflow-hidden"
        style={{ height, width }}
      >
        <Poster item={item} />
        {item.attachment.kind === "video" && <PlayBadge />}
        {more > 0 && (
          <View className="absolute inset-0 items-center justify-center bg-black/45">
            <Text className="text-title2 font-semibold text-white">
              +{more}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

/** Each tile's width, and how tall a pair or a single tile stands. */
const HALF = (CARD_WIDTH - GRID_GAP) / 2;
const PAIR_HEIGHT = 180;
const TALL = 220;

/**
 * The grid's columns, left to right, each tile with its height: two side
 * by side, three as one tall and two beside it, four as two by two.
 */
function gridColumns(shown: readonly MediaItem[]) {
  const [a, b, c, d] = shown;
  if (a === undefined || b === undefined) return [];
  if (c === undefined) {
    return [
      [{ height: PAIR_HEIGHT, item: a }],
      [{ height: PAIR_HEIGHT, item: b }],
    ];
  }
  if (d === undefined) {
    const small = (TALL - GRID_GAP) / 2;
    return [
      [{ height: TALL, item: a }],
      [
        { height: small, item: b },
        { height: small, item: c },
      ],
    ];
  }
  return [
    [
      { height: HALF, item: a },
      { height: HALF, item: c },
    ],
    [
      { height: HALF, item: b },
      { height: HALF, item: d },
    ],
  ];
}

/**
 * `grid`: a collage in one rounded tile, as most messengers do: two side
 * by side, three as one tall and two beside it, four or more as a grid of
 * four with how many more on the last.
 */
export function Grid({
  message,
  items,
}: {
  message: Message;
  items: readonly MediaItem[];
}) {
  const shown = items.slice(0, GRID_MAX);
  const more = items.length - shown.length;
  const last = shown.at(-1);
  return (
    <View
      className="flex-row overflow-hidden rounded-2xl"
      style={{ borderCurve: "continuous", gap: GRID_GAP }}
    >
      {gridColumns(shown).map((column) => (
        <View key={column[0]?.item.index} style={{ gap: GRID_GAP }}>
          {column.map(({ item, height }) => (
            <GridTile
              key={item.index}
              message={message}
              item={item}
              width={HALF}
              height={height}
              more={item === last ? more : 0}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
