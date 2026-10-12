import { Text, View } from "react-native";

import { ScreenList } from "~/components/screen-list";
import { useVisibleAccounts } from "~/features/messaging/account";
import { useSpaceInvites, useSpaces } from "~/features/messaging/spaces";
import { usePreference } from "~/features/preferences/store";
import { InvitesRow } from "~/features/spaces/invite-row";
import { sortSpaces } from "~/features/spaces/sort";
import { SpaceRow } from "~/features/spaces/space-row";

function EmptySpaces() {
  return (
    <View className="items-center gap-1 px-8 pt-24">
      <Text className="text-headline text-foreground font-semibold">
        No Spaces
      </Text>
      <Text className="text-subhead text-muted text-center">
        Create a space to group conversations into channels.
      </Text>
    </View>
  );
}

/** Home's Spaces page: your invitations, then your spaces in sort order. */
export function SpacesList() {
  const { isLoading, spaces } = useSpaces();
  const invites = useSpaceInvites();
  const sort = usePreference("spacesSort");
  const ready = !isLoading && !invites.isLoading;
  const showAccount = useVisibleAccounts().length > 1;
  return (
    <ScreenList
      ready={ready}
      data={sortSpaces(spaces, sort)}
      keyExtractor={(space) => space.key}
      ListHeaderComponent={
        invites.invites.length > 0 ? (
          <InvitesRow count={invites.invites.length} />
        ) : null
      }
      ListEmptyComponent={invites.invites.length > 0 ? null : <EmptySpaces />}
      renderItem={({ item }) => (
        <SpaceRow space={item} showAccount={showAccount} />
      )}
    />
  );
}
