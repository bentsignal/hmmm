import type Animated from "react-native-reanimated";
import { useRef, useState } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { Stack, useRouter } from "expo-router";
import Add from "@expo/material-symbols/add.xml";
import EditSquare from "@expo/material-symbols/edit_square.xml";
import { useCSSVariable } from "uniwind";

import { HomePager, PagerPage } from "~/features/home/home-pager";
import { HomeTabs } from "~/features/home/home-tabs";
import { HOME_PAGES } from "~/features/home/pages";
import { FilterToolbar } from "~/features/inbox/filter-toolbar";
import { InboxList } from "~/features/inbox/inbox-list";
import { useInboxOnScreen } from "~/features/notifications/push";
import { usePreference } from "~/features/preferences/store";
import { AccountToolbar } from "~/features/session/account-toolbar";
import { SortToolbar } from "~/features/spaces/sort-toolbar";
import { SpacesList } from "~/features/spaces/spaces-list";
import { lightImpact } from "~/lib/native-extras";

/**
 * Home: the Inbox and Spaces side by side, swiped between (or picked from
 * the tabs in the header). The header's buttons follow the page: the
 * Inbox filter and compose, or the Spaces sort and New Space.
 */
export default function HomeScreen() {
  const router = useRouter();
  const background = useCSSVariable("--color-background");
  const { width } = useWindowDimensions();
  const pagerRef = useRef<Animated.ScrollView>(null);
  const position = useSharedValue(0);
  const [page, setPage] = useState(0);
  const isInbox = HOME_PAGES[page]?.key === "inbox";
  useInboxOnScreen(isInbox);
  const show = usePreference("inboxShow");
  const from = usePreference("inboxFrom");
  const sort = usePreference("spacesSort");

  function changePage(index: number) {
    setPage(index);
    lightImpact();
  }

  function select(index: number) {
    pagerRef.current?.scrollTo({ animated: true, x: index * width });
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerLargeTitleEnabled: false,
          // A solid bar with a hairline under the tabs: the glass bar's
          // blur only tracks a list it can find, and the pager hides them.
          headerShadowVisible: true,
          headerStyle: {
            backgroundColor:
              typeof background === "string" ? background : undefined,
          },
          headerTitle: () => (
            <HomeTabs page={page} position={position} onSelect={select} />
          ),
          headerTitleAlign: "center",
          headerTransparent: false,
          title: HOME_PAGES[page]?.label ?? "Home",
        }}
      />
      {isInbox ? (
        <FilterToolbar show={show} from={from} />
      ) : (
        <SortToolbar sort={sort} />
      )}
      <AccountToolbar>
        {isInbox ? (
          <Stack.Toolbar.Button
            icon={Platform.OS === "ios" ? "square.and.pencil" : EditSquare}
            accessibilityLabel="New message"
            onPress={() => router.push("/new-message")}
          />
        ) : (
          <Stack.Toolbar.Button
            icon={Platform.OS === "ios" ? "plus" : Add}
            accessibilityLabel="New space"
            onPress={() => router.push("/new-space")}
          />
        )}
      </AccountToolbar>
      <HomePager
        pagerRef={pagerRef}
        position={position}
        onPageChange={changePage}
      >
        <PagerPage>
          <InboxList />
        </PagerPage>
        <PagerPage>
          <SpacesList />
        </PagerPage>
      </HomePager>
    </>
  );
}
