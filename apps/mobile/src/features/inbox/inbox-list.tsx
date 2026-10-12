import { Text, View } from "react-native";

import { ScreenList } from "~/components/screen-list";
import { INBOX_ROW_HEIGHT } from "~/features/inbox/conversation-row";
import { filterInbox } from "~/features/inbox/filter";
import { InboxRow } from "~/features/inbox/inbox-row";
import { useVisibleAccounts } from "~/features/messaging/account";
import { useInbox } from "~/features/messaging/inbox";
import { usePreference } from "~/features/preferences/store";

function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <View className="items-center gap-1 px-8 pt-24">
      <Text className="text-headline text-foreground font-semibold">
        {title}
      </Text>
      <Text className="text-subhead text-muted text-center">{detail}</Text>
    </View>
  );
}

/** Home's Inbox page: every conversation, pinned first, as filtered. */
export function InboxList() {
  const { conversations, isLoading } = useInbox();
  const showAccount = useVisibleAccounts().length > 1;
  const show = usePreference("inboxShow");
  const from = usePreference("inboxFrom");
  const filtered = show !== "all" || from !== "everything";
  const { pinned, rest } = filterInbox(conversations ?? [], show, from);
  const items = [...pinned, ...rest];

  function empty() {
    if (isLoading) return null;
    if (!filtered) {
      return (
        <Empty
          title="No Conversations"
          detail="Start a conversation with the compose button."
        />
      );
    }
    return show === "unread" ? (
      <Empty title="All Caught Up" detail="There are no unread messages." />
    ) : (
      <Empty title="Nothing Here" detail="No conversations match the filter." />
    );
  }

  return (
    <ScreenList
      ready={!isLoading}
      data={items}
      estimatedItemSize={INBOX_ROW_HEIGHT}
      keyExtractor={(item) => item.key}
      ListEmptyComponent={empty()}
      renderItem={({ item }) => (
        <InboxRow conversation={item} showAccount={showAccount} />
      )}
    />
  );
}
