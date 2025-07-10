import Link from "next/link";
import type { SystemNoticeCode } from "../types/message-types";

export default function NoticeMessage({ code }: { code: SystemNoticeCode }) {
  return (
    <div className="flex w-full items-center gap-1">
      <div className="flex justify-start gap-2">
        {code === "N1" && (
          <span className="text-muted-foreground">
            Unfortunately, I was unable to obtain the information needed to
            answer your question. To gain access to real time information from
            the web,{" "}
            <Link href="/pricing" className="underline text-premium">
              upgrade
            </Link>{" "}
            to a premium plan.
          </span>
        )}
      </div>
    </div>
  );
}
