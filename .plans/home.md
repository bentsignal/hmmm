# Home

Home replaced the separate Inbox and Spaces tabs. Tabs are now
**Home · Activity · Settings · Search** (Activity: `.plans/activity.md`).

- Home holds pages side by side, swiped between as on X's home screen:
  **Inbox**, then **Spaces**. More pages can join later
  (`features/home/pages.ts`).
- The page names sit in the header's title spot over an accent bar that
  tracks the swipe. Tapping a name goes to that page. Each change of page
  gives a light haptic tap.
- One button on each side keeps the tabs centered and leaves room in the
  header. Left: an ellipsis menu of submenus: **Filter** (Inbox page only),
  **Sort By** (Spaces page only), and **Accounts** (both pages, with two or
  more accounts; it narrows both to one account). Its icon fills while the
  page showing is narrowed. Right: compose on Inbox, New Space on Spaces,
  one button whose icon changes so it never shifts.
- The lists inside the pager get fixed insets measured outside it
  (`ScreenListInsets`). iOS works out the insets of a list inside a
  horizontal scroll view late, which left the last row under the tab bar
  until a second scroll.
- Spaces sort by **Name**, **Recently Joined**, or **First Joined**, saved
  with the other preferences. Spaces from every account are sorted as one
  list. `joinedAt` comes from the caller's membership row; spaces from
  older PDSs have none and count as the oldest.
- Inbox rows have no swipe actions, since a sideways swipe changes the
  page. Pin, Mark as Read, Hide (channels), and Leave Group are in the
  long-press menu on both platforms.
- Home has no badge (2026-10-13): Activity has the app's only badge, for
  everything not yet seen (`.plans/activity.md`). Space invitations moved
  to Activity too.
- A space's screen lives in Home's stack (`(tabs)/(home)/spaces/…`), so
  its URL didn't change.
