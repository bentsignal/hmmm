import { useDevTools } from "~/features/dev/dev-tools";
import { useReportClientToSupport } from "~/features/support/report-client";

/**
 * What else happens when you send in a conversation: on the dev PDS, its
 * bots answer, and in your DM with Vera Support, support learns which app
 * version and device you're on.
 */
export function useAfterSend(conversationId: string) {
  const devTools = useDevTools();
  const reportClient = useReportClientToSupport();
  return () => {
    devTools.replyToMe(conversationId);
    reportClient(conversationId);
  };
}
