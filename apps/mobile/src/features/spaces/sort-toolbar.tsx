import { Platform } from "react-native";
import { Stack } from "expo-router";
import SwapVert from "@expo/material-symbols/swap_vert.xml";

import type { SpacesSort } from "~/features/preferences/store";
import { setPreference } from "~/features/preferences/store";

const ORDERS = [
  { label: "Name", value: "name" },
  { label: "Recently Joined", value: "newest" },
  { label: "First Joined", value: "oldest" },
] as const satisfies readonly { label: string; value: SpacesSort }[];

/**
 * The left header button on Home's Spaces page, in the Inbox filter's
 * place: a menu that orders the spaces by name or by when you joined them.
 * The choice is saved with the other preferences.
 */
export function SortToolbar({ sort }: { sort: SpacesSort }) {
  return (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Menu
        icon={Platform.OS === "ios" ? "arrow.up.arrow.down" : SwapVert}
        accessibilityLabel="Sort"
      >
        <Stack.Toolbar.Menu inline title="Sort By">
          {ORDERS.map((order) => (
            <Stack.Toolbar.MenuAction
              key={order.value}
              isOn={sort === order.value}
              onPress={() => setPreference("spacesSort", order.value)}
            >
              {order.label}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}
