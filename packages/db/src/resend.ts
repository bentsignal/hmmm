import { Resend } from "@convex-dev/resend";

import { components } from "./_generated/api";

export const resend = new Resend(components.resend, {
  testMode: false,
});
