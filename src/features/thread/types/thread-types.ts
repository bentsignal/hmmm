import { Doc } from "@/convex/_generated/dataModel";

export interface Thread {
  title: Doc<"threadMetadata">["title"];
  id: Doc<"threadMetadata">["threadId"];
  active: boolean;
  status: Doc<"threadMetadata">["state"];
  pinned: boolean;
}

export interface RawThread {
  id: Doc<"threadMetadata">["threadId"];
  title: Doc<"threadMetadata">["title"];
  updatedAt: Doc<"threadMetadata">["updatedAt"];
  state: Doc<"threadMetadata">["state"];
  pinned: Doc<"threadMetadata">["pinned"];
}

export interface ThreadGroup {
  label: string;
  threads: RawThread[];
}
