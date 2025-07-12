import { TableAggregate } from "@convex-dev/aggregate";
import {
  customCtx,
  customMutation,
} from "convex-helpers/server/customFunctions";
import { Triggers } from "convex-helpers/server/triggers";
import { components } from "@/convex/_generated/api";
import { DataModel } from "@/convex/_generated/dataModel";
import { internalMutation, mutation } from "@/convex/_generated/server";

// aggregate usage per user
export const usage = new TableAggregate<{
  Namespace: string;
  Key: number;
  DataModel: DataModel;
  TableName: "messageMetadata";
}>(components.aggregateUsage, {
  namespace: (doc) => doc.userId,
  sortKey: (doc) => doc._creationTime,
  sumValue: (doc) => doc.totalCost,
});

// automatically update aggregate table whenever message metadata is updates
const triggers = new Triggers<DataModel>();
triggers.register("messageMetadata", usage.trigger());

// use these mutation types when sending new messages, otherwise
// the ussage aggregate won't be updated. Don't use them for
// deleting messages though, since we don't want to erase the
// usage incurred by messages, even if they're deleted
export const usageTriggerInternalMutation = customMutation(
  internalMutation,
  customCtx(triggers.wrapDB),
);
export const usageTriggerMutation = customMutation(
  mutation,
  customCtx(triggers.wrapDB),
);
