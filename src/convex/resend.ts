import { Resend } from "@convex-dev/resend";
import { components } from "./_generated/api";

export const resend: Resend = new Resend(components.resend, {
  testMode: false,
});
