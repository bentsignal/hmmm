import type { SystemNoticeCode } from "@acme/features/messages";
import { NOTICE_MESSAGES } from "@acme/features/messages";

import { QuickLink as Link } from "~/features/quick-link/quick-link";

export function NoticeMessage({ code }: { code: SystemNoticeCode }) {
  return (
    <div className="flex w-full items-center gap-1">
      <div className="flex justify-start gap-2">
        <span className="text-muted-foreground">
          {NOTICE_MESSAGES[code]}
          {code === "N1" ? (
            <>
              {" "}
              <Link to="/pricing" className="text-premium underline">
                View Plans.
              </Link>
            </>
          ) : null}
        </span>
      </div>
    </div>
  );
}
