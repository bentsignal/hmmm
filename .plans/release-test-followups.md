# Follow-ups from the October 2026 release test

Found while release-testing the Inbox, Spaces, and media release, and left
for later on purpose. Pick them up in their own feature threads.

- **iOS video viewer doesn't open full screen on a real iPhone.** The
  viewer (`apps/mobile/src/features/conversation/video-viewer.ios.tsx`)
  asks `expo-video` to enter full screen and retries until
  `onFullscreenEnter`; it works in the simulator but not on Shawn's
  iPhone, where the inline player shows with our close button over its
  expand button. Low impact (the covered button is rarely used). Next try:
  present `AVPlayerViewController` without the transparent `/media` route
  in between, or drop our close button on iOS and rely on the player's.
- **Zoomed photos are soft.** The viewer decodes at screen size; sharp
  zoom needs tiling or a high-resolution layer loaded on zoom.
- **Android back closes the photo viewer instantly**, without its fade.
- **Uploads die with the app.** The outbox (`features/messaging/outbox.ts`)
  lives in memory; a message whose upload is interrupted by the app being
  killed is lost. Persist it.
- **iOS Inbox swipe: the separator above the swiped row stays.** Each row
  is its own one-row SwiftUI List, so it can't hide its neighbor's line.
  The fix is one SwiftUI List for the whole Inbox.
- **Message list rows snap** instead of gliding when something above them
  changes size (row layout animation was removed to stop overlaps). The
  next release's message list work should bring back smooth, overlap-free
  motion.
- **Simulator churn.** `scripts/sim.sh down` deletes the device, so every
  `up` boots a fresh simulator that spends minutes on first-boot indexing.
  Consider reusing a worktree's device (shut down, not deleted) between
  checks.
