import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useCSSVariable } from "uniwind";

import { useInbox } from "~/features/messaging/inbox";
import { useSpaceInvites } from "~/features/messaging/spaces";
import {
  blurNativeSearch,
  focusNativeSearch,
} from "~/features/search/native-search";

export default function TabsLayout() {
  const accent = useCSSVariable("--color-accent");
  const { conversations } = useInbox();
  // Channel unreads are conversations here; space invitations add to them.
  const invites = useSpaceInvites().invites.length;
  const unread = (conversations ?? []).filter(
    ({ unreadCount }) => unreadCount > 0,
  ).length;
  const badge = unread + invites;
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
        {badge > 0 && (
          <NativeTabs.Trigger.Badge>{String(badge)}</NativeTabs.Trigger.Badge>
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
