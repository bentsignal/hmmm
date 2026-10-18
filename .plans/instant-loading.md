# Instant loading (decided with Shawn, 2026-10-18)

Opening the app and switching between chats should feel instant, with
nothing shifting under the user and without fetching everything in the
background.

## Pass 1: one round trip per screen (#148)

- [x] A query's result names the queries the app asks for next to show it
      (`queryResult(data, { include })`); the PDS answers them in the same
      round trip and the client caches them. A page of messages includes
      its reactions, thread summaries, and the profiles it shows; the inbox
      includes its rows' profiles; a group includes its joins and leaves.
- [x] Reactions and thread summaries read their rows concurrently.
- [x] The inbox waits only for the names its rows show; a channel only for
      the people on screen.
- [x] The login token is saved and reused while it's valid.

## Pass 2: saved conversations, shown only as a fallback (stacked on #148)

Built in `apps/mobile/src/features/saved`. Saving follows the live cache
(`saving.ts`); a screen still loading at its deadline fills in what's saved
(`show-saved.ts`); a conversation then opens at the window its pages were
saved from, so new messages join below. Dev builds can hold back the
server's answers (Developer > Server Answers) to try it.

**Fresh data first.** A screen shows nothing until the server answers, as
before. Only when it hasn't answered in 2 s (when the PDS client itself
gives up on a server's first answer) does it show what's saved on the
device instead. From then on the account's server counts as not
answering, so its other screens show what's saved as they open, until a
live result arrives. Most opens never show saved data. There's no
indicator: an underglow under the header was tried and dropped (unclear,
showy, it covered the top message, and it lagged on Android).

- Saved per account: the inbox, and the 20 most recent conversations'
  latest 50 messages with their reactions, thread summaries, and the
  profiles they show. Signing out deletes it. Photos rely on expo-image's
  disk cache.
- [x] **Measured** with the full seed (Developer > Seed 20 Full
      Conversations, or `/dev-seed?full=1`: 4 DMs, 8 groups, 10 channels of
      60 messages with photos of every shape, links, long and short text,
      reactions, and threads). What's saved is about 35 KB a conversation
      and 29 KB for the inbox: 0.7 MB for all 20. Photos dominate: 171 of
      their 200 photos in expo-image's disk cache took 36 MB (218 KB each),
      so about 45 MB for all of them. That cache already existed; offline
      photos last as long as it keeps them.
- **One swap.** Once fresh data replaces saved data on screen, it does so
  in one update, never piece by piece.
- **Nothing moves under the user:**
  - Conversation at the bottom: new messages slide in as live ones do.
  - Conversation scrolled up: what they're reading stays put; new messages
    wait below with jump-to-latest. Edits and reactions update in place.
  - Inbox untouched: updates at once, no animation.
  - Inbox while touched or scrolling: the update waits until the list
    rests, then applies at once. This applies to live updates too.

## Pass 3: keep recent chats current (stacked on pass 2)

- Chats you've been in that have live activity stay live for a few minutes
  after you leave, so reopening one shows the new messages (and who's
  typing, once typing indicators land) immediately.
- When the live inbox shows a saved conversation changed, fetch just its
  first page (one request) and save it. Quiet chats cost nothing.
- A "last changed" marker on each conversation, so reactions and edits
  count as changes.
- Fetching starts when a finger lands on a row.

## Later

- Typing indicators merge first (another worktree); this stack merges main
  in after and shows who's typing instantly too.
- Shawn merges the whole stack at once, after testing.
