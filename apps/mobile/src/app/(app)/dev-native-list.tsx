import type {
  ListEvent,
  MessageListViewMethods,
  Row,
} from "~/features/native-list/native";
import { useRef, useState } from "react";
import { Pressable, Text, TextInput, useColorScheme, View } from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FIXTURE_BEHAVIOR,
  FIXTURE_PEOPLE,
  FIXTURE_THEME,
  FIXTURE_THEME_DARK,
  FIXTURE_TYPING,
  FIXTURE_TYPING_TWO,
  fixtureMessage,
  fixtureRows,
} from "~/features/native-list/fixtures";
import {
  CONTRACT_VERSION,
  MessageListView,
  nativeSupport,
} from "~/features/native-list/native";

/**
 * Dev builds: `/dev-native-list` shows the native message list with
 * made-up rows (features/native-list/fixtures.ts), to build and check it on
 * its own: arrivals, older pages, reactions, typing, both layouts, light and
 * dark (it follows the system), and a media-heavy mode for flinging. Taps
 * and holds show in the bar at the top.
 */
export default function DevNativeList() {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? FIXTURE_THEME_DARK : FIXTURE_THEME;
  const list = useRef<MessageListViewMethods>(null);
  const [layout, setLayout] = useState<"bubbles" | "stacked">("bubbles");
  const [heavy, setHeavy] = useState(false);
  const [rows, setRows] = useState<Row[]>(() => fixtureRows(60, 0, "bubbles"));
  const [loaded, setLoaded] = useState(60);
  const [arrivals, setArrivals] = useState(0);
  const [typing, setTyping] = useState<0 | 1 | 2>(0);
  const [lifted, setLifted] = useState<string | undefined>();
  const [last, setLast] = useState("");
  const [barHeight, setBarHeight] = useState(100);

  function reset(nextLayout: "bubbles" | "stacked", nextHeavy: boolean) {
    setLayout(nextLayout);
    setHeavy(nextHeavy);
    setLoaded(60);
    setRows(fixtureRows(60, 0, nextLayout, nextHeavy));
  }
  function arrive(count: number) {
    const added = Array.from({ length: count }, (_, index) =>
      fixtureMessage(
        -(arrivals + index + 1),
        layout,
        Date.now(),
        true,
        heavy,
      ),
    ).reverse();
    setArrivals(arrivals + count);
    setRows([...added, ...rows]);
  }
  /** The person typing sends their message: it grows out of the bubble. */
  function typed() {
    const message = {
      ...fixtureMessage(-(arrivals + 1), layout, Date.now(), true, false, FIXTURE_PEOPLE[0]),
      blocks: [{ part: "message", spans: [{ text: "On my way!" }], type: "text" as const }],
    };
    setArrivals(arrivals + 1);
    setTyping(0);
    setRows([message, ...rows]);
  }
  function toggleReaction() {
    setRows(
      rows.map((row, index) => {
        if (index !== 0 || row.kind !== "message") return row;
        const has = row.reactions.some((reaction) => reaction.mine);
        return {
          ...row,
          reactions: has
            ? []
            : [{ content: { emoji: "👍" }, count: 1, key: "👍", mine: true }],
        };
      }),
    );
  }
  function onEvent({ nativeEvent }: { nativeEvent: ListEvent }) {
    setLast(JSON.stringify(nativeEvent).slice(0, 160));
    if (nativeEvent.type === "hold") {
      // As the menu would: hide the row while it's lifted.
      setLifted(nativeEvent.rowId);
      setTimeout(() => setLifted(undefined), 1200);
    }
    if (nativeEvent.type === "reachedOlder" && loaded < 600) {
      // An older page, a moment later, as from the server.
      setTimeout(() => {
        setRows((now) => [...now, ...fixtureRows(50, loaded, layout, heavy)]);
        setLoaded(loaded + 50);
      }, 400);
    }
  }

  if (MessageListView === null || nativeSupport === null) {
    return (
      <View className="bg-background flex-1 items-center justify-center">
        <Text className="text-body text-foreground">
          This build has no native message list.
        </Text>
      </View>
    );
  }
  const typingRow =
    typing === 0 ? null : typing === 1 ? FIXTURE_TYPING : FIXTURE_TYPING_TWO;
  const shown = typingRow ? [{ ...typingRow, layout }, ...rows] : rows;
  return (
    <View className="bg-background flex-1">
      <MessageListView
        ref={list}
        style={{ flex: 1 }}
        contractVersion={CONTRACT_VERSION}
        rows={shown}
        theme={theme}
        behavior={FIXTURE_BEHAVIOR}
        insets={{ bottom: barHeight, top: insets.top + 44 }}
        keyboard
        liftedRowId={lifted}
        onEvent={onEvent}
      />
      <View
        className="bg-background/80 absolute inset-x-0 top-0 gap-1 px-2 pb-1"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-caption text-muted" numberOfLines={2}>
          v{nativeSupport.contractVersion} {rows.length} rows {last}
        </Text>
      </View>
      <KeyboardStickyView
        offset={{ closed: 0, opened: insets.bottom }}
        style={{ bottom: 0, left: 0, position: "absolute", right: 0 }}
      >
        <View
          className="bg-background/90 gap-2 px-2 pt-2"
          style={{ paddingBottom: insets.bottom }}
          onLayout={(event) => setBarHeight(event.nativeEvent.layout.height)}
        >
          <View className="flex-row flex-wrap gap-2">
            <Button
              label={layout}
              onPress={() =>
                reset(layout === "bubbles" ? "stacked" : "bubbles", heavy)
              }
            />
            <Button
              label={heavy ? "heavy" : "mixed"}
              onPress={() => reset(layout, !heavy)}
            />
            <Button label="+1" onPress={() => arrive(1)} />
            <Button label="+20" onPress={() => arrive(20)} />
            <Button label="react" onPress={toggleReaction} />
            <Button
              label={`typing ${typing}`}
              onPress={() => setTyping(typing === 2 ? 0 : typing === 0 ? 1 : 2)}
            />
            <Button label="typed" onPress={typed} />
            <Button
              label="latest"
              onPress={() => void list.current?.scrollToLatest(true)}
            />
          </View>
          <TextInput
            className="bg-fill text-body text-foreground rounded-full px-4 py-2"
            placeholder="Message"
            accessibilityLabel="Message"
          />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      className="bg-fill rounded-full px-3 py-1.5"
      onPress={onPress}
    >
      <Text className="text-footnote text-foreground">{label}</Text>
    </Pressable>
  );
}
