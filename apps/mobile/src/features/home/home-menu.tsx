import type { SFSymbol } from "expo-symbols";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import MoreHoriz from "@expo/material-symbols/more_horiz.xml";

import type { HomePage } from "./pages";
import { setPreference, usePreference } from "~/features/preferences/store";
import { setAccountFilter } from "~/features/session/account-store";
import { useSession } from "~/features/session/session-provider";
import { SPACE_ORDERS } from "~/features/spaces/sort";

/** An SF Symbol for a submenu on iOS; Android's menus go without. */
function symbol(name: SFSymbol) {
  return Platform.OS === "ios" ? name : undefined;
}

/**
 * Home's one left header button, a menu of submenus so the header keeps
 * room: Filter on the Inbox page (unread, chats or channels), Sort By on
 * the Spaces page, and Accounts on both (with two or more signed in),
 * which narrows both pages to one account. The icon fills while the page
 * showing is narrowed. Choices are saved with the other preferences.
 * Every item is written out here: a menu's items must be its direct
 * children.
 */
export function HomeMenu({ page }: { page: HomePage }) {
  const { accounts, filter } = useSession();
  const show = usePreference("inboxShow");
  const from = usePreference("inboxFrom");
  const sort = usePreference("spacesSort");
  const inboxFiltered = show !== "all" || from !== "everything";
  const narrowed = filter !== null || (page === "inbox" && inboxFiltered);
  return (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Menu
        icon={
          Platform.OS === "ios"
            ? narrowed
              ? "ellipsis.circle.fill"
              : "ellipsis.circle"
            : MoreHoriz
        }
        accessibilityLabel="Options"
      >
        {page === "inbox" && (
          <Stack.Toolbar.Menu
            title="Filter"
            icon={symbol("line.3.horizontal.decrease")}
          >
            <Stack.Toolbar.Menu inline title="Show">
              <Stack.Toolbar.MenuAction
                isOn={show === "all"}
                onPress={() => setPreference("inboxShow", "all")}
              >
                All
              </Stack.Toolbar.MenuAction>
              <Stack.Toolbar.MenuAction
                isOn={show === "unread"}
                onPress={() => setPreference("inboxShow", "unread")}
              >
                Unread
              </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
            <Stack.Toolbar.Menu inline title="From">
              <Stack.Toolbar.MenuAction
                isOn={from === "everything"}
                onPress={() => setPreference("inboxFrom", "everything")}
              >
                Everything
              </Stack.Toolbar.MenuAction>
              <Stack.Toolbar.MenuAction
                isOn={from === "chats"}
                onPress={() => setPreference("inboxFrom", "chats")}
              >
                Chats
              </Stack.Toolbar.MenuAction>
              <Stack.Toolbar.MenuAction
                isOn={from === "channels"}
                onPress={() => setPreference("inboxFrom", "channels")}
              >
                Channels
              </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
          </Stack.Toolbar.Menu>
        )}
        {page === "spaces" && (
          <Stack.Toolbar.Menu
            title="Sort By"
            icon={symbol("arrow.up.arrow.down")}
          >
            {SPACE_ORDERS.map((order) => (
              <Stack.Toolbar.MenuAction
                key={order.value}
                isOn={sort === order.value}
                onPress={() => setPreference("spacesSort", order.value)}
              >
                {order.label}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        )}
        {accounts.length > 1 && (
          <Stack.Toolbar.Menu title="Accounts" icon={symbol("person.2")}>
            <Stack.Toolbar.MenuAction
              isOn={filter === null}
              onPress={() => setAccountFilter(null)}
            >
              All Accounts
            </Stack.Toolbar.MenuAction>
            {accounts.map((account) => (
              <Stack.Toolbar.MenuAction
                key={account.address}
                isOn={filter === account.address}
                onPress={() => setAccountFilter(account.address)}
              >
                {account.address}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        )}
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}
