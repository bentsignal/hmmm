import type { LayoutChangeEvent } from "react-native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
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
import { AccountScope, useVisibleAccounts } from "~/features/messaging/account";
import { useSpaceInvites } from "~/features/messaging/spaces";
import { InviteRow } from "~/features/spaces/invite-row";

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

/** Heads the invitations, and the activity under them. */
function Heading({ title, first }: { title: string; first: boolean }) {
  return (
    <Text
      className={`text-headline text-foreground px-4 pb-1 font-semibold ${first ? "pt-2" : "pt-6"}`}
    >
      {title}
    </Text>
  );
}

function heading(key: string, title: string) {
  return { key, kind: "heading", title } satisfies ActivityListRow;
}

/**
 * The invitations under their heading, then the activity under its own;
 * without invitations, just the activity.
 */
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
    heading("heading invites", "Invites"),
    ...invites.map(
      (invite) =>
        ({
          invite,
          key: `invite ${invite.key}`,
          kind: "invite",
        }) satisfies ActivityListRow,
    ),
    ...(activity.length === 0 ? [] : [heading("heading recent", "Recent")]),
    ...activity,
  ];
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
 * What happened while you were away: space invitations to answer at the
 * top, then new messages (one row per conversation) and reactions to your
 * messages. An activity row stays until a day after it has really been on
 * screen (see `useSeenTracking`); an invitation stays until it's answered.
 */
export default function ActivityScreen() {
  // Rows seen over a day ago drop off the next time the tab is opened.
  const [now, setNow] = useState(Date.now);
  useFocusEffect(() => {
    setNow(Date.now());
  });
  const { entries, profileOf } = useActivity(now);
  const invites = useSpaceInvites();
  const showAccount = useVisibleAccounts().length > 1;
  const rows = listRows(invites.invites, entries ?? []);
  const { attachList, check, onSafeArea, onViewableItemsChanged } =
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
        ListEmptyComponent={<Empty />}
        onScroll={check}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={CANDIDATE_VIEWABILITY}
        renderItem={({ index, item }) => {
          if (item.kind === "heading") {
            return <Heading title={item.title} first={index === 0} />;
          }
          if (item.kind === "invite") {
            return (
              <AccountScope address={item.invite.account}>
                <InviteRow invite={item.invite} showAccount={showAccount} />
              </AccountScope>
            );
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
