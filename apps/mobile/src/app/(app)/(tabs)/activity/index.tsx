import type { LayoutChangeEvent } from "react-native";
import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import type {
  ActivityEntry,
  ActivityListRow,
} from "~/features/activity/activity";
import type { AccountSpaceInvite } from "~/features/messaging/spaces";
import { ScreenList } from "~/components/screen-list";
import { TabTitle } from "~/components/tab-title";
import { useActivity } from "~/features/activity/activity";
import { ActivityRow } from "~/features/activity/activity-row";
import {
  CANDIDATE_VIEWABILITY,
  useSeenTracking,
} from "~/features/activity/seen";
import { useVisibleAccounts } from "~/features/messaging/account";
import { useSpaceInvites } from "~/features/messaging/spaces";
import { useActivityOnScreen } from "~/features/notifications/push";
import { InvitesRow } from "~/features/spaces/invite-row";

function Empty() {
  return (
    <View className="items-center gap-1 px-8 pt-24">
      <Text className="text-headline text-foreground font-semibold">
        All Caught Up
      </Text>
      <Text className="text-subhead text-muted text-center">
        Mentions, replies, and reactions to your messages show up here.
      </Text>
    </View>
  );
}

/** The invitations' row (while any wait), then the activity. */
function listRows(
  invites: readonly AccountSpaceInvite[],
  entries: readonly ActivityEntry[],
) {
  const activity = entries.map(
    (entry) =>
      ({ entry, key: entry.key, kind: "activity" }) satisfies ActivityListRow,
  );
  if (invites.length === 0) return activity;
  return [
    { invites, key: "invites", kind: "invites" } satisfies ActivityListRow,
    ...activity,
  ];
}

/**
 * Whether a row shows the same as before, so the list can skip redrawing
 * it. Rows are made anew on every change to the list, but an unchanged
 * activity item is the same object.
 */
function sameRow(previous: ActivityListRow, row: ActivityListRow) {
  if (previous.kind === "invites" || row.kind === "invites") {
    return (
      previous.kind === "invites" &&
      row.kind === "invites" &&
      previous.invites === row.invites
    );
  }
  const [before, after] = [previous.entry, row.entry];
  return (
    before.item === after.item &&
    before.key === after.key &&
    before.title === after.title &&
    before.unseen === after.unseen
  );
}

/**
 * Fills the part of the screen clear of the header and tab bar. On iOS
 * the list scrolls under both, and the native safe area includes them.
 * On Android the list sits between them already, and the safe area would
 * take off the status and navigation bars too, hiding the top row from
 * the seen tracking.
 */
function SafeAreaProbe({
  onLayout,
}: {
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  return (
    <SafeAreaView
      edges={Platform.OS === "ios" ? ["top", "bottom"] : []}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <View className="flex-1" onLayout={onLayout} />
    </SafeAreaView>
  );
}

/**
 * What happened while you were away: a row for space invitations waiting
 * to be answered (it opens them), then new messages (one row per
 * conversation) and reactions to your messages. An activity row stays
 * until a day after it has really been on screen (see `useSeenTracking`);
 * the invitations' row stays while any wait.
 */
export default function ActivityScreen() {
  useActivityOnScreen();
  // Rows seen over a day ago drop off the next time the tab is opened.
  const [now, setNow] = useState(Date.now);
  useFocusEffect(() => {
    setNow(Date.now());
  });
  const { entries, profileOf } = useActivity(now);
  const invites = useSpaceInvites();
  const showAccount = useVisibleAccounts().length > 1;
  const rows = listRows(invites.invites, entries ?? []);
  const { attachList, onSafeArea, onScroll, onViewableItemsChanged } =
    useSeenTracking();
  return (
    <>
      <TabTitle title="Activity" />
      <ScreenList
        ref={attachList}
        ready={entries !== undefined && !invites.isLoading}
        data={rows}
        estimatedItemSize={88}
        keyExtractor={(row) => row.key}
        itemsAreEqual={sameRow}
        ListEmptyComponent={<Empty />}
        onScroll={onScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={CANDIDATE_VIEWABILITY}
        renderItem={({ item }) => {
          if (item.kind === "invites") {
            return <InvitesRow invites={item.invites} />;
          }
          return (
            <ActivityRow
              entry={item.entry}
              profileOf={profileOf}
              showAccount={showAccount}
            />
          );
        }}
      />
      <SafeAreaProbe onLayout={onSafeArea} />
    </>
  );
}
