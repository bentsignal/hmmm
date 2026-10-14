import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useCSSVariable } from "uniwind";

import { useActivityBadge } from "~/features/activity/activity";
import {
  blurNativeSearch,
  focusNativeSearch,
} from "~/features/search/native-search";

export default function TabsLayout() {
  const accent = useCSSVariable("--color-accent");
  // Only Activity has a badge: everything you haven't seen yet. Home's
  // rows still show their own unread dots.
  const activity = useActivityBadge();
  return (
    <NativeTabs tintColor={typeof accent === "string" ? accent : undefined}>
      {/* Native tabs give a tab's first scroll view the tab bar's inset;
          on Home that's the pager, whose lists take the insets instead. */}
      <NativeTabs.Trigger name="(home)" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "house", selected: "house.fill" }}
          md="home"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="activity">
        <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "bell", selected: "bell.fill" }}
          md="notifications"
        />
        {activity > 0 && (
          <NativeTabs.Trigger.Badge>
            {String(activity)}
          </NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gear" md="settings" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="search"
        role="search"
        listeners={{ blur: blurNativeSearch, focus: focusNativeSearch }}
      >
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
