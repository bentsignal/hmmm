import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import type { MentionCandidate } from "./mention-text";
import { Avatar } from "~/components/avatar";
import { usernameOf } from "~/features/messaging/profiles";

const ROW = 52;
/** Four and a half rows, so a longer list shows it scrolls. */
const MAX_HEIGHT = ROW * 4.5;

function PersonRow({
  person,
  onPick,
}: {
  person: MentionCandidate;
  onPick: (person: MentionCandidate) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Mention ${person.displayName}`}
      onPress={() => onPick(person)}
      className="active:bg-fill flex-row items-center gap-3 px-3"
      style={{ height: ROW }}
    >
      <Avatar name={person.displayName} size="row" uri={person.avatarUrl} />
      <View className="flex-1 flex-row items-baseline gap-2">
        <Text
          numberOfLines={1}
          className="text-body text-foreground shrink font-semibold"
        >
          {person.displayName}
        </Text>
        <Text numberOfLines={1} className="text-subhead text-muted shrink-[2]">
          {usernameOf(person.accountId)}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * The people an `@` can mention, over the message field while a name is
 * typed: photo, name, and username. Tapping one puts them in the message.
 * It fades in and out; the keyboard stays up while it's tapped.
 */
export function MentionPicker({
  people,
  inset,
  onPick,
}: {
  people: readonly MentionCandidate[];
  /** Space from the screen's sides, lining it up with the field. */
  inset: number;
  onPick: (person: MentionCandidate) => void;
}) {
  return (
    <Animated.View
      entering={FadeIn.duration(140)}
      exiting={FadeOut.duration(120)}
      className="mb-1.5 rounded-[20px]"
      style={{
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
        marginHorizontal: inset,
      }}
    >
      <View
        className="bg-background border-separator overflow-hidden rounded-[20px]"
        style={{ borderWidth: StyleSheet.hairlineWidth }}
      >
        <FlatList
          data={people}
          keyExtractor={(person) => person.accountId}
          getItemLayout={(_, index) => ({
            index,
            length: ROW,
            offset: ROW * index,
          })}
          renderItem={({ item }) => <PersonRow person={item} onPick={onPick} />}
          keyboardShouldPersistTaps="always"
          style={{ maxHeight: MAX_HEIGHT }}
          accessibilityLabel="People to mention"
        />
      </View>
    </Animated.View>
  );
}
