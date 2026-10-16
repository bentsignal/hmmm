import { useState } from "react";
import Animated, { FadeIn } from "react-native-reanimated";
import { Stack, useLocalSearchParams } from "expo-router";
import { Button, FieldGroup, Text } from "@expo/ui";

import type { ConversationThread } from "~/features/messaging/thread-lists";
import { FieldList } from "~/components/field-list";
import { NativeHost } from "~/components/native-host";
import { SegmentedSection } from "~/components/segmented-section";
import { ThreadListItem } from "~/features/conversation-info/thread-items";
import { AccountScope } from "~/features/messaging/account";
import { useProfileState } from "~/features/messaging/profiles";
import {
  threadPeople,
  useConversationThreads,
} from "~/features/messaging/thread-lists";
import { secondaryTextStyle } from "~/lib/colors";
import { linkButton } from "~/lib/ui-modifiers";

/**
 * Yours and All side by side, switched with a segmented control rather
 * than a swipe, which would fight the swipe back.
 */
const MODES = ["Yours", "All"] as const;

type Mode = (typeof MODES)[number];

/** What the list says when it has no threads to show. */
function emptyText(mode: Mode) {
  return mode === "Yours"
    ? "You're not in any threads here yet."
    : "No threads here yet.";
}

/**
 * The threads shown, with their people's names. Rows wait for names the
 * first time, so they never switch from usernames to names; later ones
 * (another page) come in with the names they have.
 */
function useShownThreads(threads: readonly ConversationThread[] | undefined) {
  const profiles = useProfileState(threadPeople(threads ?? []));
  const [loaded, setLoaded] = useState(false);
  const ready = loaded || (threads !== undefined && !profiles.isLoading);
  if (ready && !loaded) setLoaded(true);
  return { profileOf: profiles.profileOf, ready };
}

function Threads({
  conversationId,
  title,
}: {
  conversationId: string;
  title: string;
}) {
  const [mode, setMode] = useState<Mode>("All");
  const mine = mode === "Yours";
  // Both lists load, so switching between them is instant.
  const yours = useConversationThreads({ conversationId, mine: true });
  const all = useConversationThreads({ conversationId, mine: false });
  const list = mine ? yours : all;
  const threads = list.isLoading ? undefined : list.threads;
  const { profileOf, ready } = useShownThreads(threads);
  const shown = threads ?? [];

  return (
    <>
      <Stack.Title>Threads</Stack.Title>
      {ready && (
        <Animated.View entering={FadeIn.duration(220)} style={{ flex: 1 }}>
          <NativeHost style={{ flex: 1 }}>
            <FieldList>
              <SegmentedSection
                values={MODES}
                value={mode}
                onChange={setMode}
              />
              {/* One section that keeps its place: Compose crashes when a
                  section holding React Native views (the photos) is
                  swapped for another. */}
              <FieldGroup.Section key="threads">
                {shown.length === 0 ? (
                  <Text textStyle={secondaryTextStyle}>{emptyText(mode)}</Text>
                ) : (
                  shown.map((thread) => (
                    <ThreadListItem
                      key={thread.threadId}
                      conversationId={conversationId}
                      title={title}
                      thread={thread}
                      profileOf={profileOf}
                    />
                  ))
                )}
                {list.hasMore && (
                  <Button
                    label="Show More"
                    variant="text"
                    modifiers={linkButton}
                    onPress={list.loadMore}
                  />
                )}
              </FieldGroup.Section>
            </FieldList>
          </NativeHost>
        </Animated.View>
      )}
    </>
  );
}

/** Every thread in a conversation, or only yours, newest reply first. */
export default function ConversationThreadsScreen() {
  const { account, conversationId, title } = useLocalSearchParams<{
    /** The signed-in account the conversation is opened as. */
    account?: string;
    conversationId: string;
    /** The conversation's name, for the thread pages it opens. */
    title?: string;
  }>();
  return (
    <AccountScope address={account}>
      <Threads conversationId={conversationId} title={title ?? ""} />
    </AccountScope>
  );
}
