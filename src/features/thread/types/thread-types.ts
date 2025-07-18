import { Doc } from "@/convex/_generated/dataModel";

export interface Thread {
  title: Doc<"threadMetadata">["title"];
  id: Doc<"threadMetadata">["threadId"];
  active: boolean;
  status: Doc<"threadMetadata">["state"];
  pinned: boolean;
}
