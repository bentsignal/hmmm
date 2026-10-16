import type { SFSymbol } from "expo-symbols";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import MoreHoriz from "@expo/material-symbols/more_horiz.xml";

import type { HomePage } from "./pages";
import type { InboxKind } from "~/features/preferences/inbox-kinds";
import {
  INBOX_KINDS,
  isDefaultInboxKinds,
} from "~/features/preferences/inbox-kinds";
import {
  setPreference,
  toggleInboxKind,
  usePreference,
} from "~/features/preferences/store";
import { setAccountFilter } from "~/features/session/account-store";
import { useSession } from "~/features/session/session-provider";
import { SPACE_ORDERS } from "~/features/spaces/sort";

const KIND_LABELS = {
  channels: "Channels",
  chats: "Chats",
  threads: "Threads",
} satisfies Record<InboxKind, string>;

const SHOW_CHOICES = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
] as const;

/**
 * A menu item's key, which changes when it's checked or unchecked. Android
 * keeps the menu open, and Compose draws a check mark only for an item
 * checked when it mounted, so a newly checked item mounts again.
 */
function checkedKey(value: string, checked: boolean) {
  return `${value}:${checked ? "on" : "off"}`;
}

/** An SF Symbol for a submenu on iOS; Android's menus go without. */
function symbol(name: SFSymbol) {
  return Platform.OS === "ios" ? name : undefined;
}

/**
 * Home's one left header button, a menu: on the Inbox page, Show (all or
 * unread) and Include (chats, channels, threads, ticked together), Sort
 * By on the Spaces page, and Accounts on both (with two or more signed
 * in), which narrows both pages to one account. The icon fills while the
 * page showing is narrowed. Choices are saved with the other preferences.
 * Every item is written out here: a menu's items must be its direct
 * children.
 *
 * The Inbox's choices sit at the top of the menu, not in a submenu, and
 * ask to keep it open. Android's menu stays open while you tick; iOS
 * closes it anyway, since a changed check mark makes React Native Screens
 * replace the whole menu.
 */
export function HomeMenu({ page }: { page: HomePage }) {
  const { accounts, filter } = useSession();
  const show = usePreference("inboxShow");
  const kinds = usePreference("inboxKinds");
  const sort = usePreference("spacesSort");
  const inboxFiltered = show !== "all" || !isDefaultInboxKinds(kinds);
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
          <Stack.Toolbar.Menu inline title="Show">
            {SHOW_CHOICES.map((choice) => (
              <Stack.Toolbar.MenuAction
                key={checkedKey(choice.value, show === choice.value)}
                isOn={show === choice.value}
                unstable_keepPresented
                onPress={() => setPreference("inboxShow", choice.value)}
              >
                {choice.label}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        )}
        {page === "inbox" && (
          <Stack.Toolbar.Menu inline title="Include">
            {INBOX_KINDS.map((kind) => (
              <Stack.Toolbar.MenuAction
                key={checkedKey(kind, kinds.includes(kind))}
                isOn={kinds.includes(kind)}
                unstable_keepPresented
                onPress={() => toggleInboxKind(kind)}
              >
                {KIND_LABELS[kind]}
              </Stack.Toolbar.MenuAction>
            ))}
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
