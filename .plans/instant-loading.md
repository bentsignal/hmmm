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

## Pass 2: saved conversations, shown only as a fallback

**Fresh data first.** A screen waits for the server as it does now and fades
in complete. Only when the server hasn't answered by a deadline (about 1 s
for the inbox on launch, about 0.8 s for a conversation; tuned on Shawn's
phone) does it fade in what's saved on the device instead, with the
underglow running. Most opens never show saved data or the glow.

- Saved per account: the inbox, and the 20 most recent conversations'
  latest 50 messages with their reactions, thread summaries, and the
  profiles they show. Signing out deletes it. Photos rely on expo-image's
  disk cache.
- **Measure first:** a dev seed that fills 20 conversations × 50 messages
  with a realistic mix (photos, long and short text, reactions, threads),
  and the size of what's saved.
- **One swap.** Once fresh data replaces saved data on screen, it does so
  in one update, never piece by piece, and then the glow fades out.
- **Nothing moves under the user:**
  - Conversation at the bottom: new messages slide in as live ones do.
  - Conversation scrolled up: what they're reading stays put; new messages
    wait below with jump-to-latest. Edits and reactions update in place.
  - Inbox untouched: updates at once, no animation.
  - Inbox while touched or scrolling: the update waits until the list
    rests, then applies at once. This applies to live updates too.
- **Underglow:** a soft, slowly shimmering gradient under the header, in the
  theme color with a couple of neighbors, falling off downward so it lights
  the top row a little. Reanimated on the UI thread and the CSS gradients
  the app already uses, so no native build. On Home (Inbox and Spaces) and
  in conversations and threads. Offline, it fades out after about 10 s and
  returns when the connection does.

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
