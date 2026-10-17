# More tab (decided with Shawn, 2026-10-17)

The Settings tab became **More**: your accounts at the top, then a short
list of rows that each open their own screen, so the tab has room for
things that aren't settings, such as contacts.

- Tabs: **Home · Activity · More · Search**. The icon is a 2×2 grid; an
  ellipsis looked odd in the tab bar.
- Not "You" or "Profile": you're signed into every account at once, so
  the tab isn't about one person.
- The page has no title. Adding an account is the person-plus button in
  the corner of the bar, whatever the number of accounts. Your accounts
  lead the page:
  - one account: a row (photo, name, address) that opens the account;
  - more than one: a strip of every account (photo and name), scrolling
    when they don't fit, with any unreachable ones dimmed.
- Then **Settings** (appearance, message style, themes, app icon,
  experimental) and **Notifications**, **About** (version, channel,
  update) on its own, and **Sign Out** (of all accounts, when there are
  several) at the bottom, which leaves the device on the welcome screen.
- No action rows hanging under a profile (Shawn doesn't like the split
  separator): Add Account went to the bar, and an account's Change Photo
  became a camera badge on the photo (tap the profile to change it).
- Routes: `/more`, `/more/settings`, `/more/notifications`,
  `/more/account`, `/more/about`.

## Later

- Contacts, as its own row.
