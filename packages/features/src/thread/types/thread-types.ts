import type { EventType } from "@acme/db/agent/validators";
import type { Doc } from "@acme/db/model";

export interface Thread {
  title: Doc<"threads">["title"];
  id: Doc<"threads">["_id"];
  active: boolean;
  latestEvent: EventType | null;
  pinned: boolean;
}

export interface PureThread {
  id: Doc<"threads">["_id"];
  title: Doc<"threads">["title"];
  updatedAt: Doc<"threads">["updatedAt"];
  latestEvent: EventType | null;
  pinned: Doc<"threads">["pinned"];
}
