# Replies and threads (decided with Shawn, 2026-10-16)

Slack's model, with one change: where you reply decides where the reply
shows. Reply from the conversation (long-press or double-tap, then Reply)
and it shows in the conversation, quoting the message, and joins that
message's thread. Reply in the thread and it stays there. There is no "also
send to the conversation" checkbox. Threads are flat (a reply belongs to
its thread, never to another reply) and work in DMs, groups, and channels
alike. (Revised with Shawn, 2026-10-16: at first only a thread's first
reply showed in the conversation, whichever way it was sent.)

## Starting and opening a thread

- **Tapping a message once** opens its thread page: the message on top,
  its replies under it like comments, and a composer at the bottom.
  Tapping a reply opens the thread it belongs to. Photos, videos, and
  links keep their own taps. A single tap waits 200ms to rule out a
  double tap (which still shows reactions).
- **Reply** is the first action in the long-press menu. It always replies
  from the conversation: a "Replying to …" bar sits over the composer, and
  the sent reply shows in the conversation as a reply card, even when the
  message's thread already has replies. Several people replying this way
  each get their own card; all of them join the message's one thread.
  - On a reply, it quotes that reply and joins the thread it's in.
  - The thread page has no Reply action: everything there replies to the
    thread, and stays there, even a thread's first reply.
- No "also send to the conversation" option.

## In the conversation

- A reply sent from the conversation shows there as a **reply card**: the
  message it answers, small, with a curve from under its bottom-left
  corner down to the reply, and how many other replies its thread has
  ("View 4 more replies"). Tapping it opens the thread.
- A thread's **original** shows its count under it ("5 replies", with the
  newest repliers' photos), Slack-style, whenever it has replies, so a
  thread started on the thread page shows in the conversation too.
  Tapping it opens the thread.
- Replies sent in the thread stay there: nothing new is added to the
  bottom of the conversation, and the conversation doesn't move up the
  Inbox or gain unread messages.

## Who's in a thread

- The original message's author, everyone who replied, and anyone who
  turned on its bell. The thread page's header has a bell to stop (or
  start) notifications for that one thread.

## Notifications and Activity

- Settings → Notifications gets **Replies to Your Messages** and **Thread
  Replies**. The original message's author hears about replies through
  the first; everyone else in the thread through the second.
- A reply sent from the conversation is also a message there. The author
  of the message it answers gets "Replied to your message" (or, with that
  switch off, the usual message push); everyone else gets the usual
  message push, and anyone in the thread whom the conversation doesn't
  alert (say, at Mentions) hears of it as a thread reply.
- A muted conversation (or space) silences its threads too. They still
  show in Activity.
- Activity has one row per thread with new replies (the ones kept in the
  thread; those sent from the conversation show in its row). It opens the
  thread and counts toward the badge. Opening the thread sees it.
- A thread push opens the thread. Pushes carry the original message's ID
  as `messageId`, so apps from before threads open the conversation there.

## Finding threads (decided with Shawn, 2026-10-16)

- **Inbox filter.** Home's left header menu on the Inbox has Show (All
  or Unread) and Include, checkboxes for **Chats**, **Channels**, and
  **Threads**. Chats and Channels are ticked by default; Threads was too
  until 2026-10-17, when Activity became about you (see
  `.plans/activity.md`), and that update turned Threads off once for
  everyone, keeping the rest of a saved choice (Shawn's call). Include replaces From
  (Everything / Chats / Channels); a saved From carries over (Chats or
  Channels stays that, Everything becomes the default). More kinds can join
  the list later. Both sections sit at the top of the menu rather than
  in a Filter submenu.
- The menu asks to stay open while you tick. Android's does. iOS closes
  it after each tick: React Native Screens replaces the whole native menu
  when a check mark changes, and fixing that means patching its native
  code, which Shawn said isn't worth it.
- **Threads in the Inbox.** No tab or page of their own: thread rows mix
  into the Inbox, newest reply first. A row shows the original's author,
  the conversation, the original's first line, and "4 replies · Leo:
  latest reply". It opens the thread. Unread shows threads with unread
  replies (others' replies after your thread `lastReadAt`, leaving out
  those sent from the conversation, which are read there). Long-press offers Open
  Conversation, Mark as Read, and Unfollow Thread.
- The Inbox lists only threads **you're in** with the bell on. Turning a
  thread's bell off takes it out of the Inbox and out of Yours (as it
  already does in Activity): the bell is how you leave a thread. Threads
  in muted conversations and spaces, and in channels left out of the
  Inbox, stay out, as in Activity.
- **Conversation info.** DMs, groups, and channels get a **Threads**
  section with the three with the newest replies, and **See All**. A row
  shows the original's author photo, its first two lines, "4 replies · 2h
  ago" with the newest repliers' photos, and an unread dot (you're in it,
  with unread replies) or a bell (you're in it). The section doesn't
  show without threads.
- **See All** has a segmented **Yours / All** switch (All first selected,
  since it continues the info page's list; a swipe between them would
  fight swipe back) and Show More for older threads. It had a search
  field at first; Shawn dropped it after testing, as not useful enough
  for threads.
- **The thread page's header** ("Thread" over the conversation's name)
  opens the conversation: back to it when the thread was opened from
  there, otherwise at the original message.

## How it works

- A reply is a message with `threadId` (its original's ID). `send` takes
  `threadOnly` from the app: true from the thread page, false from the
  conversation. Without it (apps from before this), the PDS sets
  `threadOnly` on every reply after the thread's first. `list`, unread
  counts, the Inbox's last message, and Activity's message rows leave
  `threadOnly` replies out (`by_chat_sent`). A reply also stores a `quote`
  of the message it answers (author, text, first attachment) for the card:
  `send`'s `threadId` may name a reply, which is quoted while the reply
  joins its original's thread.
- Apps from before this show a thread only through its first reply's card,
  so a thread started on the thread page doesn't show in their
  conversation.
- `threads` holds each thread's reply count and newest reply on the PDS;
  `threadMembers` holds each account's place in a thread: read state,
  newest reply, and whether they turned its bell off.
- `messages.thread` pages a thread's replies and returns its original;
  `messages.threadSummaries` gives reply counts for the messages on
  screen, gathered from every member's PDS like reactions.
  `messages.threadState`, `markThreadRead`, and `setThreadFollowed` are the
  caller's own.
- `messages.threads` pages a conversation's threads (`by_conversation_reply`,
  or the caller's `threadMembers` with `mine`), gathered from every
  member's PDS like summaries. `messages.inboxThreads` lists the caller's threads across conversations
  (`by_account_reply`) from their home PDS, like the inbox.
- Like messages and reactions, replies live on their author's home PDS.
  With one production server the PDS sees every reply; with federation,
  thread membership (and older apps' first-reply check) only see the PDS's
  own replies.
