import type { Doc } from "@acme/db/model";

export interface Thread {
  title: Doc<"threads">["title"];
  id: Doc<"threads">["_id"];
  active: boolean;
  status: Doc<"threads">["state"];
  pinned: boolean;
}

export interface PureThread {
  id: Doc<"threads">["_id"];
  title: Doc<"threads">["title"];
  updatedAt: Doc<"threads">["updatedAt"];
  state: Doc<"threads">["state"];
  pinned: Doc<"threads">["pinned"];
}

export interface ThreadGroup {
  label: string;
  threads: PureThread[];
}
