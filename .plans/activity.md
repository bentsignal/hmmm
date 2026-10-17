# Activity tab and notification settings (decided with Shawn, 2026-10-11/12)

A tab for what you missed since you last looked: new messages, reactions to
your messages, and space invitations, in one list. Alongside it, control
over which notifications you get.

## Activity is about you (decided with Shawn, 2026-10-17)

A friend's point: a feed of every new message repeats the Inbox. Activity
now lists only what's about you, so it has more signal than noise; Home
covers the rest. This replaces parts of the sections below, as noted there.

- **Activity lists** mentions, replies to your messages, replies in
  threads you're in, reactions to your messages, and space invitations.
  New messages in DMs, groups, and channels aren't in it anymore; the
  Inbox has them.
- **Replies to your messages** sent in the conversation (a reply card)
  are a row each: "Maya replied to your message in Weekend crew", the
  reply, and "On “your message”". Tapping opens the conversation at the
  reply. They show from groups and channels at any level but Hide Alerts
  (like mentions), not from a thread whose bell you turned off, and not
  when the reply mentions you too (its mention shows). In a DM everything
  is to you already, so the Inbox has those. Replies kept in the thread
  are the thread's row, as before.
- **Home has a badge**: the Inbox rows it lists with something unread,
  one each however many messages, so it follows what you show and hide
  (Include's kinds, Hide from Inbox). A row counts only if it alerts you
  about every message: one at Mentions or Hide Alerts keeps its unread
  dot without counting, since its mentions and replies to you are in
  Activity. Show (All or Unread) doesn't change it. Threads count when
  Include lists them.
- **The Inbox lists Chats and Channels by default**; Threads is off,
  since threads you're in are in Activity. The update turns Threads off
  once for everyone who had it ticked (Shawn's call); they can tick it
  again, and that sticks. Channels stay in by default
  (Shawn's choice): hide busy ones from the Inbox, set them to Mentions,
  or untick Channels to keep them off Home's badge.
- **The app icon badge** (and each push's) is Home's count plus
  Activity's. Something can count in both (a mention in a group shows as
  the group's unread row and as a mention); that's on purpose, since each
  tab clears its own. The app tells the server which kinds its Inbox
  lists when it registers for pushes, and again when they change, so a
  push's badge matches.
- **Pushes stay as they were.** Activity is what's about you; pushes are
  what you asked to be interrupted for. Every push about you has a row in
  Activity, and the rest (a DM, a group or channel at All) land on Home,
  so each push has a place that clears it.
- **Seen sooner**: a row counts as seen after half a second fully on
  screen, not 1.1 seconds.
- Apps from before this keep the old Activity: `activity` lists
  conversations unless asked for `aboutYou`, and a push token without
  `inbox` gets the old badge.

## Activity

- Tabs: **Home · Activity · Settings · Search**. Activity sits between
  Home (Inbox and Spaces) and Settings, with a bell icon.
- One list, no sub-tabs. It shows **messages** from others in DMs, groups,
  and channels (one row per conversation: who wrote, the newest message, and
  how many) and **reactions** to your messages (one row per message: who
  reacted, with what, and your message).
- **Seen means on screen.** A row counts as seen only once it has been
  entirely on screen (not under the header or tab bar, not a sliver at an
  edge) for half a second (1.1 seconds until 2026-10-17), with the tab focused and the app in front. Its dot
  then fades out, so you see it go. Tapping a row also sees it, and so does
  reading its conversation anywhere (from Home, or a push): its messages up
  to what you read and every reaction in it so far (2026-10-14).
- **A seen row goes a day later**, unless something new happens in it, which
  makes it unseen again. Rows nobody has seen stay; nothing older than a week
  shows (a backstop, so a first visit isn't the whole history).
- **Space invitations**: while any wait, a "Space Invites" row with their
  count heads the list, and opens a page to accept or decline each. It
  stays until every invitation is answered. Home's Spaces page no longer
  has an Invites row, and tapping an invitation's notification opens
  Activity.
- **Activity has the app's only badge** (decided 2026-10-13; replaced
  2026-10-17, when Home got its own, above): pending
  invitations plus every activity row not yet seen (new messages and new
  reactions; muted conversations and spaces left out). Home has no badge;
  its rows keep their unread dots, muted ones included. The app icon badge
  (and each push's) is the same count.
- **Muted conversations**, channels of muted spaces, and channels hidden
  from the Inbox are left out. Unmuting starts clean: nothing from while
  it was muted shows up, or counts (`alertsSince` on the membership).
- Tapping a row opens the conversation (at the message, for a reaction).

## Notifications

- **Reactions send a push** to the message's author (not for reacting to
  your own message): the reactor as the
  sender (their photo on iOS), "Reacted ❤️ to “…”" as the body. It waits
  3 seconds, so a reaction taken back straight away sends nothing. Tapping
  it opens the message; it's cleared once the reaction is seen in Activity.
  On screen, its banner stays quiet in the conversation and on Activity.
- **Settings → Notifications**: Allow Notifications (off: no pushes at all),
  then one switch each for Direct Messages, Group Chats, Space Channels,
  Reactions, and Space Invites. They're stored on each account's server
  (which sends the pushes) and set the same for every signed-in account.
  They only decide which pushes are sent; pushes aren't stored, so turning
  a kind back on never replays old ones. Activity shows everything either
  way.
- **Muting**: Hide Alerts on any Inbox row's long-press menu (a person, a
  group, or a channel), and on a space's screen for the whole space. Muted
  things stay in the Inbox, quietly.
- **Channels' settings live in a long-press menu** on the space's screen:
  Show in Inbox / Hide from Inbox, Hide Alerts, and for owners Rename and
  Delete. The space screen's "Show in Inbox" section is gone.

## How it works

`messages.activity` builds the list on the account's home PDS from the
inbox's conversations and from reactions that name their message's author
(`messageAuthorId`, set when the message is on the reactor's PDS).
`messages.markActivitySeen` stores a sighting per item: when it was seen
and through which activity. Activity seen over a day ago is left out.
Push settings are `messages.notificationSettings` /
`setNotificationSettings`; a space's mute is `setSpaceMuted` (on the
caller's space membership).

## Later

- Thread replies and mentions have Activity rows since 2026-10-16 (see
  `.plans/threads.md` and `.plans/mentions.md`).
- Federation: like the inbox, activity lists only the home PDS's messages
  and reactions, and a reaction's push goes out only when the message is on
  the reactor's PDS.
