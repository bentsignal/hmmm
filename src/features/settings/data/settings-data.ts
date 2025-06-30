import { Cog, User, CreditCard, ChartNoAxesColumn, Mail } from "lucide-react";

export const settingsTabs = [
  [
    {
      label: "General",
      href: "/settings",
      icon: Cog,
    },
    {
      label: "Account",
      href: "/account",
      icon: User,
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
