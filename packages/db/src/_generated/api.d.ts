/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_agents from "../ai/agents.js";
import type * as ai_models_helpers from "../ai/models/helpers.js";
import type * as ai_models_image from "../ai/models/image.js";
import type * as ai_models_language from "../ai/models/language.js";
import type * as ai_models_types from "../ai/models/types.js";
import type * as ai_prompts from "../ai/prompts.js";
import type * as ai_suggestions from "../ai/suggestions.js";
import type * as ai_thread_helpers from "../ai/thread/helpers.js";
import type * as ai_thread_mutations from "../ai/thread/mutations.js";
import type * as ai_thread_queries from "../ai/thread/queries.js";
import type * as ai_tools_code_generation from "../ai/tools/code_generation.js";
import type * as ai_tools_date_time from "../ai/tools/date_time.js";
import type * as ai_tools_files_actions from "../ai/tools/files/actions.js";
import type * as ai_tools_files_index from "../ai/tools/files/index.js";
import type * as ai_tools_image_actions from "../ai/tools/image/actions.js";
import type * as ai_tools_image_helpers from "../ai/tools/image/helpers.js";
import type * as ai_tools_image_index from "../ai/tools/image/index.js";
import type * as ai_tools_image_types from "../ai/tools/image/types.js";
import type * as ai_tools_index from "../ai/tools/index.js";
import type * as ai_tools_search_current_events from "../ai/tools/search/current_events.js";
import type * as ai_tools_search_index from "../ai/tools/search/index.js";
import type * as ai_tools_search_postition_holder from "../ai/tools/search/postition_holder.js";
import type * as ai_tools_search_schemas from "../ai/tools/search/schemas.js";
import type * as ai_tools_tool_helpers from "../ai/tools/tool_helpers.js";
import type * as ai_tools_weather from "../ai/tools/weather.js";
import type * as app_actions from "../app/actions.js";
import type * as app_file_helpers from "../app/file_helpers.js";
import type * as app_library from "../app/library.js";
import type * as app_storage from "../app/storage.js";
import type * as convex_helpers from "../convex_helpers.js";
import type * as counter from "../counter.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as kv from "../kv.js";
import type * as lib_date_time_utils from "../lib/date_time_utils.js";
import type * as lib_utils from "../lib/utils.js";
import type * as limiter from "../limiter.js";
import type * as mail_actions from "../mail/actions.js";
import type * as mail_newsletter from "../mail/newsletter.js";
import type * as mail_templates from "../mail/templates.js";
import type * as migrations from "../migrations.js";
import type * as polar from "../polar.js";
import type * as resend from "../resend.js";
import type * as types_library from "../types/library.js";
import type * as uploadthing from "../uploadthing.js";
import type * as user_account from "../user/account.js";
import type * as user_clerk from "../user/clerk.js";
import type * as user_info from "../user/info.js";
import type * as user_subscription from "../user/subscription.js";
import type * as user_usage from "../user/usage.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/agents": typeof ai_agents;
  "ai/models/helpers": typeof ai_models_helpers;
  "ai/models/image": typeof ai_models_image;
  "ai/models/language": typeof ai_models_language;
  "ai/models/types": typeof ai_models_types;
  "ai/prompts": typeof ai_prompts;
  "ai/suggestions": typeof ai_suggestions;
  "ai/thread/helpers": typeof ai_thread_helpers;
  "ai/thread/mutations": typeof ai_thread_mutations;
  "ai/thread/queries": typeof ai_thread_queries;
  "ai/tools/code_generation": typeof ai_tools_code_generation;
  "ai/tools/date_time": typeof ai_tools_date_time;
  "ai/tools/files/actions": typeof ai_tools_files_actions;
  "ai/tools/files/index": typeof ai_tools_files_index;
  "ai/tools/image/actions": typeof ai_tools_image_actions;
  "ai/tools/image/helpers": typeof ai_tools_image_helpers;
  "ai/tools/image/index": typeof ai_tools_image_index;
  "ai/tools/image/types": typeof ai_tools_image_types;
  "ai/tools/index": typeof ai_tools_index;
  "ai/tools/search/current_events": typeof ai_tools_search_current_events;
  "ai/tools/search/index": typeof ai_tools_search_index;
  "ai/tools/search/postition_holder": typeof ai_tools_search_postition_holder;
  "ai/tools/search/schemas": typeof ai_tools_search_schemas;
  "ai/tools/tool_helpers": typeof ai_tools_tool_helpers;
  "ai/tools/weather": typeof ai_tools_weather;
  "app/actions": typeof app_actions;
  "app/file_helpers": typeof app_file_helpers;
  "app/library": typeof app_library;
  "app/storage": typeof app_storage;
  convex_helpers: typeof convex_helpers;
  counter: typeof counter;
  crons: typeof crons;
  http: typeof http;
  kv: typeof kv;
  "lib/date_time_utils": typeof lib_date_time_utils;
  "lib/utils": typeof lib_utils;
  limiter: typeof limiter;
  "mail/actions": typeof mail_actions;
  "mail/newsletter": typeof mail_newsletter;
  "mail/templates": typeof mail_templates;
  migrations: typeof migrations;
  polar: typeof polar;
  resend: typeof resend;
  "types/library": typeof types_library;
  uploadthing: typeof uploadthing;
  "user/account": typeof user_account;
  "user/clerk": typeof user_clerk;
  "user/info": typeof user_info;
  "user/subscription": typeof user_subscription;
  "user/usage": typeof user_usage;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
  polar: import("@convex-dev/polar/_generated/component.js").ComponentApi<"polar">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  shardedCounter: import("@convex-dev/sharded-counter/_generated/component.js").ComponentApi<"shardedCounter">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  aggregateUsage: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregateUsage">;
  aggregateStorage: import("@convex-dev/aggregate/_generated/component.js").ComponentApi<"aggregateStorage">;
};
