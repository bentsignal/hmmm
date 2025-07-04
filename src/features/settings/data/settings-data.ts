import { Cog, CreditCard, ChartNoAxesColumn, Mail, User } from "lucide-react";

export const settingsTabs = [
  [
    {
      label: "General",
      href: "/settings/general",
      icon: Cog,
    },
    {
      label: "Account",
      href: "/settings/account",
      icon: User,
    },
  ],
  [
    {
      label: "Billing",
      href: "/settings/billing",
      icon: CreditCard,
    },
    {
      label: "Usage",
      href: "/settings/usage",
      icon: ChartNoAxesColumn,
    },
  ],
  [
    {
      label: "Contact",
      href: "/settings/contact",
      icon: Mail,
    },
  ],
];
