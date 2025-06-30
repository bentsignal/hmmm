import { Cog, CreditCard, ChartNoAxesColumn, Mail, User } from "lucide-react";

export const settingsTabs = [
  [
    {
      label: "Account",
      href: "/account",
      icon: User,
    },
    {
      label: "General",
      href: "/settings",
      icon: Cog,
    },
  ],
  [
    {
      label: "Billing",
      href: "/billing",
      icon: CreditCard,
    },
    {
      label: "Usage",
      href: "/usage",
      icon: ChartNoAxesColumn,
    },
  ],
  [
    {
      label: "Contact",
      href: "/contact",
      icon: Mail,
    },
  ],
];
