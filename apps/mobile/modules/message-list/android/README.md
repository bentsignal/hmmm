# Android message list

`MessageListModule` exposes the Expo view backed by a reversed RecyclerView.
The shared contract is `src/features/native-list/contract.ts`, relative to the
mobile app. JavaScript supplies the rows, appearance, timings, and menu layout.

## Optional capabilities

- `benchFling` scrolls with Choreographer and `scrollBy`, without injected
  touches or fling physics. It reports actual distance and time at the older
  edge. Use the same speed and duration as the React Native benchmark.
- `liftHandoff` adds `landLift()`. JavaScript starts it as the menu closes
  and keeps the transparent Modal mounted until its promise resolves.
- `lift` moves the held native view and its tapbacks into the React Modal
  window's decor overlay. The row keeps its space and defers binding changes
  until landing. The view returns during the conversation window's pre-draw. A landing-only
  drawing of the same native views covers that exact resting position until
  the source window commits its frame. Android's Dialog and activity buffers
  commit independently; pre-draw alone left a one-frame hole. The cover does
  not use a bitmap or create another message view, and it never moves apart
  from the original.
- Custom React rows currently use `fallbackText`. This binary does not report
  `customRows`.

A plain text lift gets the same card as the existing menu: 10 dp horizontal
and 8 dp vertical inset, radius 16. The overlay reserves drawing space around
its children because Android clips overlay RenderNodes to their bounds.

## Pagination

The older-page signal uses a lower bound for the remaining rows, rather than
multiplying their count by the height of the currently visible media. Known
text and media dimensions contribute to the bound; uncertain wrapped lines,
reactions, and footers are omitted. JavaScript still owns `loadAheadScreens`.

## Validation

Use the repository's simulator skill and shared heavy-work lock. A focused JVM
check, from `apps/mobile/android`, is:

```sh
./gradlew :message-list:testDebugUnitTest
```

`PaginationTest` covers short rows following tall media, sufficient remaining
content, a newly appended page, font scaling, and ordinary versus panoramic
photo dimensions. `/dev-native-list` exercises
both layouts, the lift menu, reactions, typing changes, keyboard, and media.
Its `bench` button runs 5,500 dp/s for ten seconds and logs the result.

`LiftTargetTest` covers a held third photo whose part differs from its media
block after a caption, omitted blocks in the rendered slot mapping, and an
unknown item that must not fall back to lifting the caption. Carousel lifts
resolve the containing block by item part, then lift only its visible tile.

`CarouselDetachTest` uses Robolectric to model a native screen transition's
recursive `startViewTransition` ownership, then detaches and reattaches at the
third photo three times. Restoring `recycleChildrenOnDetach = true` reproduces
the attached-view recycling exception; the normal detach policy passes.
It also checks that a transition-owned tile can move to the lift overlay and
back, and that its inner carousel holder can remain pinned until landing.

Carousels keep their children on window detach. `react-native-screens` marks
descendants as transitioning, so eagerly removing and recycling a card during
the same detach traversal can recycle a view that still has a parent. See
[Screen's recursive transition ownership](https://github.com/software-mansion/react-native-screens/blob/4.26.2/android/src/main/java/com/swmansion/rnscreens/Screen.kt)
and [LinearLayoutManager's optional detach recycling](<https://developer.android.com/reference/androidx/recyclerview/widget/LinearLayoutManager#setRecycleChildrenOnDetach(boolean)>).
Lifts end transition ownership before removing a native part and pin both the
outer row and any inner carousel holder. These changes complement the item-part
lookup fix; correcting which item lifts alone does not fix the detach crash.

The Android emulator uses software GL on this Mac. Frame intervals include
that rendering cost and host contention; recordings establish visual behavior,
not a 60 fps phone result. The integration branch owns the same-chat,
production-bundle comparison and the final phone clients. Do not enable the
native list for everyone based on emulator recordings alone.
