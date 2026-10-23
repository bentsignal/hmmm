import type { ListEvent, Row } from "~/features/native-list/native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FIXTURE_BEHAVIOR,
  FIXTURE_THEME,
  FIXTURE_THEME_DARK,
  FIXTURE_TYPING,
  fixtureMessage,
  fixtureRows,
  withRuns,
} from "~/features/native-list/fixtures";
import {
  CONTRACT_VERSION,
  MessageListView,
  nativeSupport,
} from "~/features/native-list/native";

/**
 * Dev builds: `/dev-native-list` shows the native message list with
 * made-up rows (features/native-list/fixtures.ts), to build and check it on
 * its own: arrivals, older pages, reactions, typing, both layouts. Taps and
 * holds show in the bar at the top.
 */
export default function DevNativeList() {
  const insets = useSafeAreaInsets();
  const [layout, setLayout] = useState<"bubbles" | "stacked">("bubbles");
  const [rows, setRows] = useState<Row[]>(() => fixtureRows(60, 0, "bubbles"));
  const [loaded, setLoaded] = useState(60);
  const [arrivals, setArrivals] = useState(0);
  const [typing, setTyping] = useState(false);
  const [dark, setDark] = useState(false);
  const [last, setLast] = useState("");

  function relayout(next: "bubbles" | "stacked") {
    setLayout(next);
    setRows(fixtureRows(loaded, 0, next));
  }
  function arrive(count: number) {
    const added = Array.from({ length: count }, (_, index) =>
      fixtureMessage(-(arrivals + index + 1), layout, Date.now(), true),
    ).reverse();
    setArrivals(arrivals + count);
    setRows(withRuns([...added, ...rows]));
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
    setLast(JSON.stringify(nativeEvent).slice(0, 120));
    if (nativeEvent.type === "reachedOlder" && loaded < 600) {
      // An older page, a moment later, as from the server.
      setTimeout(() => {
        setRows((now) => withRuns([...now, ...fixtureRows(50, loaded, layout)]));
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
  const shown = typing
    ? [{ ...FIXTURE_TYPING, layout }, ...rows]
    : rows;
  return (
    <View
      className="flex-1"
      style={{ backgroundColor: dark ? "#000000" : "#ffffff" }}
    >
      <MessageListView
        style={{ flex: 1 }}
        contractVersion={CONTRACT_VERSION}
        rows={shown}
        theme={dark ? FIXTURE_THEME_DARK : FIXTURE_THEME}
        behavior={FIXTURE_BEHAVIOR}
        insets={{ bottom: insets.bottom + 56, top: insets.top + 44 }}
        keyboard
        onEvent={onEvent}
      />
      <View
        className="absolute inset-x-0 top-0 gap-1 px-2"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-caption text-muted" numberOfLines={1}>
          v{nativeSupport.contractVersion} {last}
        </Text>
      </View>
      <View
        className="bg-background absolute inset-x-0 bottom-0 flex-row flex-wrap gap-2 px-2 pt-2"
        style={{ paddingBottom: insets.bottom }}
      >
        <Button
          label={layout}
          onPress={() => relayout(layout === "bubbles" ? "stacked" : "bubbles")}
        />
        <Button label="+1" onPress={() => arrive(1)} />
        <Button label="+20" onPress={() => arrive(20)} />
        <Button label="react" onPress={toggleReaction} />
        <Button label="typing" onPress={() => setTyping(!typing)} />
        <Button label={dark ? "light" : "dark"} onPress={() => setDark(!dark)} />
      </View>
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
