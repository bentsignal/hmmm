# Next release: extra steps

One-off steps the next release needs on top of the normal flow in
[releasing.md](releasing.md). The `vera-release` skill requires working
through this file. Do every step in order, and check each one's **Verify**
before moving on. A step that fails or can't be done blocks the release; tell
Shawn instead of skipping it.

`pnpm release plan` lists these steps, and production builds and updates
refuse to run until `--next-release-done` confirms the ones due by then are
done. After the release, open a PR that removes the finished steps (leave
the heading and intro so the file stays in place for the next release).

Adding steps: any PR whose release needs something beyond `pnpm release`
adds a section here in that PR (see AGENTS.md → Releases).

## Test held and double-tapped messages with several photos (#132 with #134)

**What:** #132 (tap, hold, and double tap anywhere across a message's row)
and #134 (reactions on each photo, file, or the text of a message) both
change how a held or double-tapped message lifts into the menu, in the same
files (`message-actions.tsx`, `message-reactions.tsx`, `message-stacked.tsx`,
`message-bubble.tsx`, `glass-message-menu.tsx`). Before #134, holding a
message with three photos lifts all three together; #134 is meant to keep
them separate. Shawn has a test message with three photos for this.

**When:** in the release test on Shawn's phone, before shipping. Only due
if both PRs are in the release.

**Steps:** on a message with several photos and text, in both the bubble
and stacked layouts:

1. Hold, then double tap, each photo, and the text. Each opens the same
   menu either way, and lifts and reacts to the part you touched (#134).
2. Hold, then double tap, the empty space beside the message. The menu
   opens, a bubble message lifts at its own size, and a stacked row lifts
   whole on a card (#132).
3. Tap beside the message: its thread opens. Tap a photo: the viewer opens.
4. React from each menu and check the reaction lands on the part you meant.

**Verify:** every step above behaves as described, with no part lifting
another part's photos with it.
