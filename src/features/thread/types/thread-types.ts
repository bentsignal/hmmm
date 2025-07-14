import { Doc } from "@/convex/_generated/dataModel";

export interface ThreadListItemProps {
  title: string;
  id: string;
  active: boolean;
  status: Doc<"threadMetadata">["state"];
}
