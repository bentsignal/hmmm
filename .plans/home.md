# Home

Home replaced the separate Inbox and Spaces tabs. Tabs are now
**Home · Settings · Search**.

- Home holds pages side by side, swiped between as on X's home screen:
  **Inbox**, then **Spaces**. More pages can join later
  (`features/home/pages.ts`).
- The page names sit in the header's title spot over an accent bar that
  tracks the swipe. Tapping a name goes to that page. Each change of page
  gives a light haptic tap.
- The header's buttons follow the page. Inbox: the filter menu (left), the
  account menu and compose (right). Spaces: the sort menu (left), the
  account menu and New Space (right). The account menu narrows both pages
  to one account, as before.
- Spaces sort by **Name**, **Recently Joined**, or **First Joined**, saved
  with the other preferences. Spaces from every account are sorted as one
  list. `joinedAt` comes from the caller's membership row; spaces from
  older PDSs have none and count as the oldest.
- Inbox rows have no swipe actions, since a sideways swipe changes the
  page. Pin, Mark as Read, Hide (channels), and Leave Group are in the
  long-press menu on both platforms.
- The Home tab's badge counts unread conversations plus space invitations.
- A space's screen and Invites now live in Home's stack
  (`(tabs)/(home)/spaces/…`), so their URLs didn't change.
