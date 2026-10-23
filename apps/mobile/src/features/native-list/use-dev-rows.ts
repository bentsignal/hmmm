import { useRef, useState } from "react";

import type { Block, ListEvent, Row } from "./contract";
import { devMessage, devRows, devTyping, PEOPLE } from "./dev-fixtures";

/** How many messages the dev screen loads at most, in pages of 50. */
const MOST = 600;

/**
 * The made-up conversation `/dev-native-list` shows, and what its buttons
 * do to it: arrivals, a reaction, typing, older pages, and layouts.
 */
export function useDevRows() {
  const [layout, setLayout] = useState<"bubbles" | "stacked">("bubbles");
  const [heavy, setHeavy] = useState(false);
  const [rows, setRows] = useState<Row[]>(() => devRows(60, 0, "bubbles"));
  const [arrivals, setArrivals] = useState(0);
  const [typing, setTyping] = useState<0 | 1 | 2>(0);
  const [lifted, setLifted] = useState<string | undefined>();
  const [last, setLast] = useState("");
  // Messages loaded so far, and whether a page is on its way: a ref, so a
  // second request while one loads doesn't load the same page twice.
  const loaded = useRef({ count: 60, loading: false });

  function reset(nextLayout: "bubbles" | "stacked", nextHeavy: boolean) {
    setLayout(nextLayout);
    setHeavy(nextHeavy);
    loaded.current = { count: 60, loading: false };
    setRows(devRows(60, 0, nextLayout, nextHeavy));
  }
  function arrive(count: number) {
    const added = Array.from({ length: count }, (_, index) =>
      devMessage(-(arrivals + index + 1), layout, Date.now(), {
        arrived: true,
        heavy,
      }),
    ).reverse();
    setArrivals(arrivals + count);
    setRows([...added, ...rows]);
  }
  /** The person typing sends their message: it grows out of the bubble. */
  function typed() {
    const message = {
      ...devMessage(-(arrivals + 1), layout, Date.now(), {
        arrived: true,
        author: PEOPLE[0],
      }),
      blocks: [
        { part: "message", spans: [{ text: "On my way!" }], type: "text" },
      ] satisfies Block[],
    };
    setArrivals(arrivals + 1);
    setTyping(0);
    setRows([message, ...rows]);
  }
  function toggleReaction() {
    setRows(
      rows.map((row, index) => {
        if (index !== 0 || row.kind !== "message") return row;
        const has = row.reactions.some((reaction) => reaction.mine);
        return {
          ...row,
          reactions: has
            ? []
            : [{ content: { emoji: "👍" }, count: 1, key: "👍", mine: true }],
        };
      }),
    );
  }
  function loadOlder() {
    const { count, loading } = loaded.current;
    if (loading || count >= MOST) return;
    loaded.current = { count, loading: true };
    // A moment later, as from the server.
    setTimeout(() => {
      loaded.current = { count: count + 50, loading: false };
      setRows((now) => [...now, ...devRows(50, count, layout, heavy)]);
    }, 400);
  }
  function onEvent({ nativeEvent }: { nativeEvent: ListEvent }) {
    setLast(JSON.stringify(nativeEvent).slice(0, 160));
    if (nativeEvent.type === "hold") {
      // As the menu would: hide the row while it's lifted.
      setLifted(nativeEvent.rowId);
      setTimeout(() => setLifted(undefined), 1200);
    }
    if (nativeEvent.type === "reachedOlder") loadOlder();
  }

  return {
    arrive,
    heavy,
    last,
    layout,
    lifted,
    nextTyping: () => setTyping(typing === 2 ? 0 : typing === 0 ? 1 : 2),
    onEvent,
    reset,
    rows: typing === 0 ? rows : [devTyping(layout, typing), ...rows],
    toggleReaction,
    typed,
    typing,
  };
}
