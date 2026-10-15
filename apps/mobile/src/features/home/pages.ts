/** Home's pages, left to right. More can join later. */
export const HOME_PAGES = [
  { key: "inbox", label: "Inbox" },
  { key: "spaces", label: "Spaces" },
] as const;

export type HomePage = (typeof HOME_PAGES)[number]["key"];
