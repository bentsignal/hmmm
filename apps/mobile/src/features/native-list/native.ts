import type { ComponentType, Ref } from "react";
import { Platform } from "react-native";
import { requireNativeView, requireOptionalNativeModule } from "expo";

import type {
  MessageListViewMethods,
  MessageListViewProps,
  NativeSupport,
} from "./contract";

export * from "./contract";

// The native message list (see src/contract.ts and
// .plans/native-message-list.md). The module is `MessageList` on both
// platforms; its view is `MessageListView`.

const module = requireOptionalNativeModule<{
  support: NativeSupport;
}>("MessageList");

/**
 * What the installed binary can draw, or null when it has no native list
 * (an older build): the app keeps the React Native list then.
 */
export const nativeSupport: NativeSupport | null =
  Platform.OS === "web" ? null : (module?.support ?? null);

/** The native list view, once `nativeSupport` says it's there. */
export const MessageListView =
  nativeSupport === null
    ? null
    : requireNativeView<
        MessageListViewProps & { ref?: Ref<MessageListViewMethods> }
      >("MessageList");

export type MessageListViewComponent = ComponentType<
  MessageListViewProps & { ref?: Ref<MessageListViewMethods> }
>;
