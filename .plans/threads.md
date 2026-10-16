# Replies and threads (decided with Shawn, 2026-10-16)

Slack's model, with one change: a thread's first reply also shows in the
conversation, so people see that a thread started. Threads are flat (a
reply belongs to its thread, never to another reply) and work in DMs,
groups, and channels alike.

## Starting and opening a thread

- **Tapping a message once** opens its thread page: the message on top,
  its replies under it like comments, and a composer at the bottom.
  Tapping a reply opens the thread it belongs to. Photos, videos, and
  links keep their own taps. A single tap waits 200ms to rule out a
  double tap (which still shows reactions).
- **Reply** is the first action in the long-press menu.
  - On a message with no replies yet, it replies from the conversation: a
    "Replying to …" bar sits over the composer, and the sent reply shows in
    the conversation as a reply card.
  - On a message that already has a thread, or on a reply, it opens the
    thread page with the keyboard up.
  - The thread page has no Reply action: everything there replies to the
    thread.
- No "also send to the conversation" option.

## In the conversation

- A thread's **first reply** shows in the conversation as a **reply card**:
  the original message, small, with a curve from under its bottom-left
  corner down to the reply. Tapping it opens the thread.
- Later replies stay in the thread. The card counts them ("4 more
  replies"); nothing new is added to the bottom of the conversation, and
  the conversation doesn't move up the Inbox or gain unread messages.
- If two people send a first reply at the same moment, whichever the PDS
  stores first is the one in the conversation.

## Who's in a thread

- The original message's author, everyone who replied, and anyone who
  turned on its bell. The thread page's header has a bell to stop (or
  start) notifications for that one thread.

## Notifications and Activity

- Settings → Notifications gets **Replies to Your Messages** and **Thread
  Replies**. The original message's author hears about replies through
  the first; everyone else in the thread through the second.
- The first reply is also a message in the conversation. Its author's
  original gets "Replied to your message" (or, with that switch off, the
  usual message push); everyone else gets the usual message push.
- A muted conversation (or space) silences its threads too. They still
  show in Activity.
- Activity has one row per thread with new replies (the replies after the
  first, which shows as a message in the conversation's row). It opens the
  thread and counts toward the badge. Opening the thread sees it.
- A thread push opens the thread. Pushes carry the original message's ID
  as `messageId`, so apps from before threads open the conversation there.

## Finding threads (decided with Shawn, 2026-10-16)

- **Inbox filter.** Home's left header menu on the Inbox has Show (All
  or Unread) and Include, checkboxes for **Chats**, **Channels**, and
  **Threads**, all ticked by default. Include replaces From
  (Everything / Chats / Channels); a saved From carries over (Chats or
  Channels stays that, Everything becomes all three). More kinds can join
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
  the first, which is read in the conversation). Long-press offers Open
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

- A reply is a message with `threadId` (its original's ID). The PDS sets
  `threadOnly` on every reply after the first; `list`, unread counts, the
  Inbox's last message, and Activity's message rows leave those out
  (`by_chat_sent`). A reply also stores a `quote` of its original (author,
  text, first attachment) for the card.
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
  the first-reply check and thread membership only see the PDS's own
  replies.
