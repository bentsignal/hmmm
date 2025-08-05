import Link from "next/link";
import { NOTICE_MESSAGES } from "../data/notice-messages";
import type { SystemNoticeCode } from "../types/message-types";

export default function NoticeMessage({ code }: { code: SystemNoticeCode }) {
  return (
    <div className="flex w-full items-center gap-1">
      <div className="flex justify-start gap-2">
        {code === "N1" && (
          <span className="text-muted-foreground">
            {NOTICE_MESSAGES[code]}{" "}
            <Link href="/pricing" className="text-premium underline">
              View Plans.
            </Link>
          </span>
        )}
      </div>
    </div>
  );
}
