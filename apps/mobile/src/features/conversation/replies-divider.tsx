import { StyleSheet, Text, View } from "react-native";

/**
 * Under a thread's original: how many replies there are, then a rule
 * that runs to the edge, as Slack draws it.
 */
export function RepliesDivider({ count }: { count: number }) {
  const label =
    count === 0
      ? "No replies yet"
      : `${count} ${count === 1 ? "reply" : "replies"}`;
  return (
    <View className="flex-row items-center gap-3 px-4 pt-5 pb-1">
      <Text className="text-footnote text-muted font-semibold">{label}</Text>
      <View
        className="bg-separator flex-1"
        style={{ height: StyleSheet.hairlineWidth }}
      />
    </View>
  );
}
