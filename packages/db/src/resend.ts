import { Resend } from "@convex-dev/resend";

import { components } from "./_generated/api";

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- Convex component type
export const resend = new Resend(components.resend, {
  testMode: false,
});
