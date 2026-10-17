# More tab (decided with Shawn, 2026-10-17)

The Settings tab became **More**: your accounts at the top, then a short
list of rows that each open their own screen, so the tab has room for
things that aren't settings, such as contacts.

- Tabs: **Home · Activity · More · Search**. The icon is a 2×2 grid; an
  ellipsis looked odd in the tab bar.
- Not "You" or "Profile": you're signed into every account at once, so
  the tab isn't about one person.
- The page has no title. Your accounts lead it:
  - one account: a card (photo, name, address) that opens the account,
    with Add Account under it;
  - more than one: a strip of every account (photo and name), scrolling
    when they don't fit, with any unreachable ones dimmed and a plus tile
    at the end.
- Then **Settings** (appearance, message style, themes, app icon,
  experimental) and **Notifications**, and **About** (version, channel,
  update) on its own.
- Routes: `/more`, `/more/settings`, `/more/notifications`,
  `/more/account`, `/more/about`.

## Later

- Contacts, as its own row.
