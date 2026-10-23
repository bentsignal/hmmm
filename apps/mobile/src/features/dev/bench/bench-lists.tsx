import type { ComponentProps } from "react";
import type { LayoutChangeEvent } from "react-native";
import { FlatList } from "react-native";
import { LegendList } from "@legendapp/list/react-native";

import type { BenchEngine } from "./bench-api";
import type { BenchRows } from "./bench-shell";
import type { MessageRow } from "~/features/conversation/build-rows";
import type { MessageLayout } from "~/features/preferences/store";
import { ANCHOR } from "~/features/conversation/list-position";
import { BenchRow, BenchScrollView } from "./bench-shell";

// The list engines the benchmark compares (see `bench.tsx`), each set up as
// its makers recommend for a chat, showing the same rows.

export interface BenchListProps {
  /** Oldest first. */
  rows: readonly MessageRow[];
  layout: MessageLayout;
  /** Older messages are wanted: the top is near. */
  onNearTop: () => void;
  onContentHeight: (height: number) => void;
  onViewport: (height: number) => void;
  /** Recycle row views (Legend List). */
  recycle: boolean;
  /** How far beyond the screen to render, in points. */
  drawDistance: number;
  /** How much of each row to render (see `BenchRow`). */
  rowKind: BenchRows;
  /** How many screens from the top older messages are asked for. */
  ahead: number;
}

/** For lists that take a function rendering their scroll view. */
function renderBenchScroll(props: ComponentProps<typeof BenchScrollView>) {
  return <BenchScrollView {...props} />;
}

function keyOf(row: MessageRow) {
  return row.key;
}

function typeOf(row: MessageRow) {
  return row.type;
}

function viewportOf(onViewport: (height: number) => void) {
  return (event: LayoutChangeEvent) =>
    onViewport(event.nativeEvent.layout.height);
}

/** Today's: an inverted FlatList, set up as the conversation's is. */
function FlatListBench({
  rows,
  layout,
  onNearTop,
  onContentHeight,
  onViewport,
  rowKind,
  ahead,
}: BenchListProps) {
  return (
    <FlatList
      inverted
      data={rows.toReversed()}
      keyExtractor={keyOf}
      renderItem={({ item }) => (
        <BenchRow row={item} layout={layout} rows={rowKind} />
      )}
      initialNumToRender={20}
      maxToRenderPerBatch={4}
      windowSize={11}
      maintainVisibleContentPosition={ANCHOR}
      onEndReached={onNearTop}
      onEndReachedThreshold={ahead}
      renderScrollComponent={renderBenchScroll}
      onContentSizeChange={(_, height) => onContentHeight(height)}
      onLayout={viewportOf(onViewport)}
      style={{ flex: 1 }}
    />
  );
}

/** Legend List as a chat: aligned to the end, not inverted. */
function LegendBench({
  rows,
  layout,
  onNearTop,
  onContentHeight,
  onViewport,
  recycle,
  drawDistance,
  rowKind,
  ahead,
}: BenchListProps) {
  return (
    <LegendList
      data={rows}
      keyExtractor={keyOf}
      getItemType={typeOf}
      renderItem={({ item }) => (
        <BenchRow row={item} layout={layout} rows={rowKind} />
      )}
      estimatedItemSize={80}
      alignItemsAtEnd
      initialScrollAtEnd
      maintainScrollAtEnd
      maintainScrollAtEndThreshold={0.1}
      maintainVisibleContentPosition={{ data: true, size: true }}
      onStartReached={onNearTop}
      onStartReachedThreshold={ahead}
      recycleItems={recycle}
      drawDistance={drawDistance}
      renderScrollComponent={renderBenchScroll}
      onContentSizeChange={(_, height) => onContentHeight(height)}
      onLayout={viewportOf(onViewport)}
      style={{ flex: 1 }}
    />
  );
}

/**
 * The floor: a plain scroll view of the newest 300 rows, all rendered, no
 * virtualization, for what scrolling costs on its own.
 */
function ScrollBench({
  rows,
  layout,
  onContentHeight,
  onViewport,
  rowKind,
}: BenchListProps) {
  return (
    <BenchScrollView
      // Starts at the newest message, like a conversation.
      contentOffset={{ x: 0, y: 1e6 }}
      onContentSizeChange={(_, height) => onContentHeight(height)}
      onLayout={viewportOf(onViewport)}
      style={{ flex: 1 }}
    >
      {rows.slice(-300).map((row) => (
        <BenchRow key={row.key} row={row} layout={layout} rows={rowKind} />
      ))}
    </BenchScrollView>
  );
}

export function BenchList({
  engine,
  ...props
}: BenchListProps & { engine: BenchEngine }) {
  if (engine === "legend") return <LegendBench {...props} />;
  if (engine === "scroll") return <ScrollBench {...props} />;
  return <FlatListBench {...props} />;
}
