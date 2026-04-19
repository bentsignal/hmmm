import type { LegendListRef } from "@legendapp/list/react";
import { useEffect, useRef, useState } from "react";
// eslint-disable-next-line no-restricted-imports -- non-suspending useQuery so the thread view reacts to state flips without a suspense boundary while a response streams
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

import { useMessageStore } from "@acme/features/messages";
import { threadQueries, useThreadStore } from "@acme/features/thread";
import { Button } from "@acme/ui/button";

import "@/features/messages/styles/github-dark.min.css";
import "@/features/messages/styles/message-styles.css";

import { Abyss } from "~/components/abyss";
import { Messages } from "~/features/messages/messages";
import { ThreadTitleUpdater } from "./components/thread-title-updater";

function useThread(threadId: string) {
  const listRef = useRef<LegendListRef>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // set active thread when component mounts
  const setActiveThread = useThreadStore((state) => state.setActiveThread);
  // eslint-disable-next-line no-restricted-syntax -- Syncs active thread ID with the thread store on mount/unmount
  useEffect(() => {
    setActiveThread(threadId);
    return () => {
      setActiveThread(null);
    };
  }, [threadId, setActiveThread]);

  // thread is idle when no in-flight event exists for it
  const { data: isThreadIdle = false } = useQuery({
    ...threadQueries.state(threadId),
    select: (latestEvent) => latestEvent === null,
  });

  // track new-message sends so we can (a) add a 50vh bumper for the response to
  // stream into and (b) explicitly scroll to the bottom when the user sends
  const numMessagesSent = useMessageStore((state) => state.numMessagesSent);
  const [initialSent] = useState(() => numMessagesSent);
  const hasSent = numMessagesSent > initialSent;
  // eslint-disable-next-line no-restricted-syntax -- Syncs list scroll position with a user-driven send event
  useEffect(() => {
    if (numMessagesSent > initialSent) {
      void listRef.current?.scrollToEnd({ animated: true });
    }
  }, [numMessagesSent, initialSent]);

  return {
    listRef,
    isThreadIdle,
    hasSent,
    isAtBottom,
    setIsAtBottom,
  };
}

export function Thread({ threadId }: { threadId: string }) {
  const { listRef, isThreadIdle, hasSent, isAtBottom, setIsAtBottom } =
    useThread(threadId);

  return (
    <div className="relative flex h-full w-full flex-1 flex-col items-center justify-start">
      <ThreadTitleUpdater threadId={threadId} />
      <Abyss />
      <Messages
        ref={listRef}
        threadId={threadId}
        isThreadIdle={isThreadIdle}
        hasSent={hasSent}
        onIsAtEndChange={setIsAtBottom}
      />
      {!isAtBottom && (
        <div className="absolute right-0 bottom-36 z-10 flex w-full items-center justify-center rounded-full p-0 sm:bottom-24">
          <Button
            onClick={() =>
              void listRef.current?.scrollToEnd({ animated: true })
            }
            className="font-semibold shadow-lg"
            variant="default"
          >
            Scroll to bottom <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
