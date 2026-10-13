# Activity tab (decided with Shawn, 2026-10-11)

A tab for what you missed since you last looked: new messages and reactions
to your messages, in one list.

## Decisions

- Tabs: **Home · Activity · Settings · Search**. Activity sits between
  Home (Inbox and Spaces) and Settings, with a bell icon.
- One list, no sub-tabs. It shows **messages** from others in DMs, groups,
  and channels (one row per conversation: who wrote, the newest message, and
  how many) and **reactions** to your messages (one row per message: who
  reacted, with what, and your message).
- **Seen means on screen.** A row counts as seen only once it has been
  entirely on screen (not under the header or tab bar, not a sliver at an
  edge) for 0.6 seconds, with the tab focused and the app in front. Opening
  the conversation elsewhere doesn't count. Unseen rows have the accent dot.
- **A seen row goes a day later**, unless something new happens in it, which
  makes it unseen again. Rows nobody has seen stay; nothing older than a week
  shows (a backstop, so a first visit isn't the whole history).
- **Space invitations** sit at the top under an "Invites" heading (the
  activity follows under "Recent"), each with Accept and Decline, until
  answered. They moved here from Home's Spaces page, which no longer has an
  Invites row; Home's badge no longer counts them. Tapping an invitation's notification opens
  Activity.
- The tab's **badge counts invitations and unseen reactions**; unread
  messages already count on Home's badge. The app icon badge is
  unchanged.
- **Muted conversations** and channels hidden from the Inbox are left out.
- Tapping a row opens the conversation (at the message, for a reaction).

## How it works

`messages.activity` builds the list on the account's home PDS from the
inbox's conversations and from reactions that name their message's author
(`messageAuthorId`, set when the message is on the reactor's PDS).
`messages.markActivitySeen` stores a sighting per item: when it was seen
and through which activity. Activity seen over a day ago is left out.

## Later

- Mentions, replies, and space invitations as activity.
- Federation: like the inbox, activity lists only the home PDS's messages
  and reactions.
- Push notifications for reactions.
