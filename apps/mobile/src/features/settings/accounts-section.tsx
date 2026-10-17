import { Alert, Pressable, Text as RNText, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, FieldGroup, RNHostView, Text } from "@expo/ui";

import type { StoredAccount } from "~/features/session/account-store";
import { Avatar } from "~/components/avatar";
import { Carousel } from "~/components/carousel";
import { ListItem } from "~/components/list-item";
import { SymbolIcon } from "~/components/symbol-icon";
import {
  AccountScope,
  useAccount,
  useAccounts,
} from "~/features/messaging/account";
import { useMyProfile } from "~/features/messaging/directory";
import { useSession } from "~/features/session/session-provider";
import { cn } from "~/lib/cn";
import { secondaryTextStyle } from "~/lib/colors";
import { linkButton } from "~/lib/ui-modifiers";
import { removeUnreachableAccount } from "./sign-out";

/** The account's name and photo, and a way to open its screen. */
function useAccountCard() {
  const router = useRouter();
  const { address, username } = useAccount();
  const { profile } = useMyProfile();
  const displayName = profile?.displayName ?? username;
  return {
    address,
    avatarUrl: profile?.avatarUrl ?? null,
    displayName,
    open: () =>
      router.push({
        params: { account: address, title: displayName },
        pathname: "/more/account",
      }),
  };
}

/** Explains an account whose server can't be found, to retry or remove it. */
function confirmUnreachable(account: StoredAccount, retry: () => void) {
  Alert.alert(
    `Can't Reach ${account.domain}`,
    "This account is hidden until its server is back. If the server is gone for good, remove the account from this device.",
    [
      { style: "cancel", text: "Cancel" },
      { onPress: retry, text: "Try Again" },
      {
        onPress: () => removeUnreachableAccount(account),
        style: "destructive",
        text: "Remove Account",
      },
    ],
  );
}

/** With one account: a card for it, like the account card atop iOS Settings. */
function ProfileCard() {
  const router = useRouter();
  const card = useAccountCard();
  return (
    <FieldGroup.Section>
      <ListItem
        leading={
          <Avatar name={card.displayName} size="lg" uri={card.avatarUrl} />
        }
        trailing={
          <SymbolIcon
            name={{ android: "chevron_right", ios: "chevron.right" }}
            size={14}
            weight="semibold"
            tintColorClassName="accent-subtle"
          />
        }
        supportingText={
          <Text textStyle={secondaryTextStyle}>{card.address}</Text>
        }
        onPress={card.open}
      >
        <Text textStyle={{ fontSize: 22, fontWeight: "600" }}>
          {card.displayName}
        </Text>
      </ListItem>
      <Button
        label="Add Account"
        variant="text"
        modifiers={linkButton}
        onPress={() => router.push("/add-account")}
      />
    </FieldGroup.Section>
  );
}

/**
 * One tile in the account strip: a circle with a caption under it. The
 * tap is React Native's, inside the host view, since a native button
 * around a host view never gets it on Android.
 */
function Tile({
  label,
  caption,
  dimmed = false,
  onPress,
  children,
}: {
  label: string;
  caption: string;
  dimmed?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <RNHostView matchContents>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        className={cn(
          "w-[72px] items-center gap-1.5 py-1 active:opacity-60",
          dimmed && "opacity-45",
        )}
      >
        {children}
        <RNText
          numberOfLines={1}
          className="text-footnote text-foreground max-w-full"
        >
          {caption}
        </RNText>
      </Pressable>
    </RNHostView>
  );
}

function AccountTile() {
  const card = useAccountCard();
  return (
    <Tile label={card.address} caption={card.displayName} onPress={card.open}>
      <Avatar name={card.displayName} size="header" uri={card.avatarUrl} />
    </Tile>
  );
}

/**
 * With more than one account: every account side by side, scrolling when
 * they don't fit, with any whose server can't be reached dimmed, and a
 * plus at the end to add another.
 */
function AccountStrip() {
  const router = useRouter();
  const accounts = useAccounts();
  const { retryUnreachable, unreachable } = useSession();
  return (
    <FieldGroup.Section>
      <Carousel>
        {accounts.map((account) => (
          <AccountScope key={account.address} address={account.address}>
            <AccountTile />
          </AccountScope>
        ))}
        {unreachable.map((account) => (
          <Tile
            key={account.address}
            label={`${account.address}, can't reach ${account.domain}`}
            caption={account.address}
            dimmed
            onPress={() => confirmUnreachable(account, retryUnreachable)}
          >
            <Avatar name={account.address} size="header" uri={null} />
          </Tile>
        ))}
        <Tile
          label="Add Account"
          caption="Add"
          onPress={() => router.push("/add-account")}
        >
          <View className="bg-fill size-[52px] items-center justify-center rounded-full">
            <SymbolIcon
              name={{ android: "add", ios: "plus" }}
              size={22}
              weight="semibold"
              tintColorClassName="accent-accent"
            />
          </View>
        </Tile>
      </Carousel>
    </FieldGroup.Section>
  );
}

/**
 * The top of More: the signed-in account as a card, or every account in a
 * strip once there's more than one. Each opens that account's screen.
 */
export function AccountsSection() {
  const accounts = useAccounts();
  const { unreachable } = useSession();
  const [only] = accounts;
  if (only && accounts.length === 1 && unreachable.length === 0) {
    return (
      <AccountScope address={only.address}>
        <ProfileCard />
      </AccountScope>
    );
  }
  return <AccountStrip />;
}
