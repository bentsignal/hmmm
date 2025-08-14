import { Doc } from "@/convex/_generated/dataModel";

export type LibraryView = "grid" | "list";

export type LibrarySort = "date";

export type LibraryTab = "all" | "images" | "documents";

export type LibraryMode = "default" | "select";

export interface LibraryFile {
  id: Doc<"files">["_id"];
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}
