import type { Plan } from "@/convex/user/subscription";

const GB = 1024 * 1024 * 1024;

export const storageLimits: Record<Plan["name"], number> = {
  Free: 0 * GB,
  Light: 5 * GB,
  Premium: 20 * GB,
  Ultra: 50 * GB,
  Unlimited: 100 * GB,
};

export const libraryPagination = {
  initialSize: 12,
  pageSize: 48,
  loaderIndex: 24,
};

export const MAX_ATTACHMENTS_PER_MESSAGE = 10;
