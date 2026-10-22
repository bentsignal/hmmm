// How far each row opening in a batch rises (see `joinArrivals`).

/**
 * What each of a batch of rows rises by, given the room each makes, oldest
 * first: its own and that of every newer one, under it in the list. The
 * oldest rises by them all, as the rows above move up by them all.
 */
export function risesOf(rooms: readonly number[]) {
  "worklet";
  const rises = new Array<number>(rooms.length);
  let below = 0;
  for (let index = rooms.length - 1; index >= 0; index -= 1) {
    below += rooms[index] ?? 0;
    rises[index] = below;
  }
  return rises;
}
