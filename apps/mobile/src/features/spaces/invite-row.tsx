import { Alert, Pressable, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";

import type { AccountSpaceInvite } from "~/features/messaging/spaces";
import { SymbolIcon } from "~/components/symbol-icon";
import { UnreadBadge } from "~/components/unread-badge";
import { useProfile, usernameOf } from "~/features/messaging/profiles";
import { useSpaceActions } from "~/features/messaging/spaces";
import { cn } from "~/lib/cn";

/**
 * Heads Activity while space invitations are waiting: how many, and who
 * they're from. Tapping it opens the invitations to answer.
 */
export function InvitesRow({
  invites,
}: {
  invites: readonly AccountSpaceInvite[];
}) {
  const [first] = invites;
  const more = invites.length - 1;
  return (
    <Link href="/activity/invites" asChild>
      <Pressable className="active:bg-fill flex-row">
        {/* The same gutter, photo size, and text column as the rows below. */}
        <View className="w-6" />
        <View
          className="bg-fill mt-3.5 size-[46px] items-center justify-center rounded-xl"
          style={{ borderCurve: "continuous" }}
        >
          <SymbolIcon
            name={{ android: "mail", ios: "envelope.fill" }}
            size={21}
            tintColorClassName="accent-accent"
          />
        </View>
        <View className="border-b-hairline border-separator ml-3 flex-1 flex-row items-center gap-2 py-3.5 pr-4">
          <View className="flex-1 gap-0.5">
            <Text className="text-headline text-foreground font-semibold">
              Space Invites
            </Text>
            <Text numberOfLines={1} className="text-subhead text-muted">
              {more > 0
                ? `${first?.name ?? ""} and ${more} more`
                : (first?.name ?? "")}
            </Text>
          </View>
          <UnreadBadge count={invites.length} />
          <SymbolIcon
            name={{ android: "chevron_right", ios: "chevron.right" }}
            size={14}
            weight="semibold"
            tintColorClassName="accent-subtle"
          />
        </View>
      </Pressable>
    </Link>
  );
}

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
 * One space you're invited to, with Accept and Decline. Both answer right
 * away: accepting opens the space on Home, and declining takes the row
 * away. Answering the last one also closes the invitations.
 */
export function InviteRow({
  invite,
  isLast,
  showAccount,
}: {
  invite: AccountSpaceInvite;
  /** The only invite left, so answering it empties the page. */
  isLast: boolean;
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
    if (isLast) router.back();
    router.navigate({
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
    if (isLast) router.back();
  }

  return (
    <View className="flex-row pl-4">
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
