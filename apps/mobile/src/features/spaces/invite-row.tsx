import { Alert, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import type { AccountSpaceInvite } from "~/features/messaging/spaces";
import { useProfile, usernameOf } from "~/features/messaging/profiles";
import { useSpaceActions } from "~/features/messaging/spaces";
import { cn } from "~/lib/cn";

function PillButton({
  label,
  prominent = false,
  onPress,
}: {
  label: string;
  prominent?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className={cn(
        "h-9 flex-1 items-center justify-center rounded-full active:opacity-70",
        prominent ? "bg-accent" : "bg-fill",
      )}
      onPress={onPress}
    >
      <Text
        className={cn(
          "text-subhead font-semibold",
          prominent ? "text-on-accent" : "text-foreground",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * One space you're invited to, at the top of Activity, with Accept and
 * Decline. Both answer right away: accepting opens the space, and
 * declining takes the row away.
 */
export function InviteRow({
  invite,
  showAccount,
}: {
  invite: AccountSpaceInvite;
  /** Names the invited account, when several show. */
  showAccount: boolean;
}) {
  const router = useRouter();
  const inviter = useProfile(invite.invitedBy);
  const { acceptInvite, declineInvite } = useSpaceActions();
  const { spaceId } = invite;

  function accept() {
    void acceptInvite
      .mutateAsync({ spaceId })
      .catch(() =>
        Alert.alert("Couldn't Join Space", "Try again in a moment."),
      );
    router.push({
      params: { account: invite.account, name: invite.name, spaceId },
      pathname: "/spaces/[spaceId]",
    });
  }

  function decline() {
    void declineInvite
      .mutateAsync({ spaceId })
      .catch(() =>
        Alert.alert("Couldn't Decline Invite", "Try again in a moment."),
      );
  }

  return (
    // Lined up with the Activity rows below: the same gutter, photo size,
    // and text column.
    <View className="flex-row">
      <View className="w-6" />
      <View
        className="bg-accent mt-3.5 size-[46px] items-center justify-center rounded-xl"
        style={{ borderCurve: "continuous" }}
      >
        <Text className="text-title text-on-accent font-bold">
          {invite.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="border-b-hairline border-separator ml-3 flex-1 gap-3 pt-3.5 pr-4 pb-4">
        <View className="gap-0.5">
          <Text className="text-headline text-foreground font-semibold">
            {invite.name}
          </Text>
          <Text numberOfLines={2} className="text-subhead text-muted">
            {[
              `${inviter.displayName} invited you`,
              `${invite.memberCount} ${invite.memberCount === 1 ? "member" : "members"}`,
              ...(showAccount ? [usernameOf(invite.account)] : []),
            ].join(" · ")}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <PillButton label="Decline" onPress={decline} />
          <PillButton label="Accept" prominent onPress={accept} />
        </View>
      </View>
    </View>
  );
}
