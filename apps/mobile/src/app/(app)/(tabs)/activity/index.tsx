import type { LayoutChangeEvent } from "react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { ScreenList } from "~/components/screen-list";
import { TabTitle } from "~/components/tab-title";
import { useActivity } from "~/features/activity/activity";
import { ActivityRow } from "~/features/activity/activity-row";
import {
  CANDIDATE_VIEWABILITY,
  useSeenTracking,
} from "~/features/activity/seen";
import { useVisibleAccounts } from "~/features/messaging/account";

function Empty() {
  return (
    <View className="items-center gap-1 px-8 pt-24">
      <Text className="text-headline text-foreground font-semibold">
        All Caught Up
      </Text>
      <Text className="text-subhead text-muted text-center">
        New messages and reactions to yours show up here.
      </Text>
    </View>
  );
}

/**
 * Fills the part of the screen clear of the header and tab bar: on iOS
 * the native safe area includes both bars, which the list scrolls under.
 */
function SafeAreaProbe({
  onLayout,
}: {
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <View className="flex-1" onLayout={onLayout} />
    </SafeAreaView>
  );
}

/**
 * What happened while you were away: new messages (one row per
 * conversation) and reactions to your messages. A row stays until a day
 * after it has really been on screen (see `useSeenTracking`).
 */
export default function ActivityScreen() {
  // Rows seen over a day ago drop off the next time the tab is opened.
  const [now, setNow] = useState(Date.now);
  useFocusEffect(() => {
    setNow(Date.now());
  });
  const { entries, profileOf } = useActivity(now);
  const showAccount = useVisibleAccounts().length > 1;
  const { attachList, check, onSafeArea, onViewableItemsChanged } =
    useSeenTracking();
  return (
    <>
      <TabTitle title="Activity" />
      <ScreenList
        ref={attachList}
        ready={entries !== undefined}
        data={entries ?? []}
        estimatedItemSize={88}
        keyExtractor={(entry) => entry.key}
        ListEmptyComponent={<Empty />}
        onScroll={check}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={CANDIDATE_VIEWABILITY}
        renderItem={({ item }) => (
          <ActivityRow
            entry={item}
            profileOf={profileOf}
            showAccount={showAccount}
          />
        )}
      />
      <SafeAreaProbe onLayout={onSafeArea} />
    </>
  );
}
