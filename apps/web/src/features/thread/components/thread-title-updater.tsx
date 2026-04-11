import { useSuspenseQuery } from "@tanstack/react-query";

import { threadQueries } from "~/lib/queries";

export default function ThreadTitleUpdater({ threadId }: { threadId: string }) {
  const { data: title } = useSuspenseQuery(threadQueries.title(threadId));

  if (title) {
    document.title = title;
  }

  return null;
}
