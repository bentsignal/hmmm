import type {
  OperationArgs,
  OperationMap,
  OperationRequest,
  OperationResponse,
  OperationResult,
  PluginProtocol,
  PluginRequirements,
  QueryRequest,
} from "@decentralized-convex/plugin";
import type {
  Auth,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  MutationBuilder,
  QueryBuilder,
  ValidatorTypeToReturnType,
} from "convex/server";
import {
  operationResponseValidator,
  operationValidator,
  queryRequestValidator,
} from "@decentralized-convex/plugin";
import { ConvexError, v } from "convex/values";

import type { DispatcherComponents } from "./dispatcher-types.ts";
import type { RoutedQueryResult } from "./routed-query.ts";
import { isRoutedQueryResult } from "./routed-query.ts";

export interface DispatcherIdentity {
  readonly [key: string]: string | undefined;
  readonly accountId?: string;
  readonly email?: string;
  readonly issuer: string;
  readonly name?: string;
  readonly subject: string;
  readonly tokenIdentifier: string;
}

const dispatcherIdentity = v.object({
  accountId: v.optional(v.string()),
  email: v.optional(v.string()),
  issuer: v.string(),
  name: v.optional(v.string()),
  subject: v.string(),
  tokenIdentifier: v.string(),
});

const componentDispatcherArgs = {
  identity: v.union(v.null(), dispatcherIdentity),
  operation: v.any(),
};

type MaybePromise<Value> = Promise<Value> | Value;

export interface OperationHandlerContext<Args> {
  readonly args: Args;
  readonly identity: DispatcherIdentity | null;
}

export type OperationHandlers<Operations extends OperationMap, Context> = {
  readonly [Name in keyof Operations]: (
    ctx: Context,
    request: OperationHandlerContext<OperationArgs<Operations[Name]>>,
  ) => MaybePromise<OperationResult<Operations[Name]>>;
};

export type QueryOperationHandlers<Operations extends OperationMap, Context> = {
  readonly [Name in keyof Operations]: (
    ctx: Context,
    request: OperationHandlerContext<OperationArgs<Operations[Name]>>,
  ) => MaybePromise<
    | OperationResult<Operations[Name]>
    | RoutedQueryResult<OperationResult<Operations[Name]>>
  >;
};

export function defineComponentDispatchers<
  DataModel extends GenericDataModel,
  const Name extends string,
  const Version extends string,
  const Queries extends OperationMap,
  const Mutations extends OperationMap,
  const Requirements extends PluginRequirements,
>({
  handlers,
  mutation,
  protocol,
  query,
}: {
  readonly handlers: {
    readonly mutations: OperationHandlers<
      Mutations,
      GenericMutationCtx<DataModel>
    >;
    readonly queries: QueryOperationHandlers<
      Queries,
      GenericQueryCtx<DataModel>
    >;
  };
  readonly mutation: MutationBuilder<DataModel, "public">;
  readonly protocol: PluginProtocol<
    Name,
    Version,
    Queries,
    Mutations,
    Requirements
  >;
  readonly query: QueryBuilder<DataModel, "public">;
}) {
  const queryOperation = operationValidator(protocol.queries);
  const mutationOperation = operationValidator(protocol.mutations);
  const queryReturns = operationResponseValidator(protocol.queries);
  const mutationReturns = operationResponseValidator(protocol.mutations);

  return {
    dispatchMutation: mutation({
      args: {
        identity: componentDispatcherArgs.identity,
        lastChanged: v.literal(protocol.lastChanged),
        operation: mutationOperation,
        version: v.string(),
      },
      returns: mutationReturns,
      handler: async (ctx, { identity, operation }) =>
        // Convex applies a top-level nullability transform that cannot be proven for an open union.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        ({
          type: operation.type,
          value: await invokeOperation(
            handlers.mutations,
            ctx,
            identity,
            operation,
          ),
        }) as ValidatorTypeToReturnType<OperationResponse<Mutations>>,
    }),
    dispatchQuery: query({
      args: {
        identity: componentDispatcherArgs.identity,
        lastChanged: v.literal(protocol.lastChanged),
        operation: queryOperation,
        version: v.string(),
      },
      returns: queryReturns,
      handler: async (ctx, { identity, operation }) =>
        // Convex applies a top-level nullability transform that cannot be proven for an open union.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        queryResponse(
          operation.type,
          await invokeQueryOperation(handlers.queries, ctx, identity, operation),
        ) as ValidatorTypeToReturnType<OperationResponse<Queries>>,
    }),
    /**
     * Several queries in one call, for the router to answer what another
     * query's result includes. One this plugin doesn't have (or that
     * fails) answers null rather than failing the rest.
     */
    dispatchQueries: query({
      args: {
        identity: componentDispatcherArgs.identity,
        requests: v.array(queryRequestValidator),
      },
      returns: v.array(v.union(v.null(), queryReturns)),
      handler: async (ctx, { identity, requests }) =>
        Promise.all(
          requests.map(async (request) => {
            if (
              request.plugin !== protocol.name ||
              request.lastChanged !== protocol.lastChanged ||
              !Object.hasOwn(handlers.queries, request.operation.type)
            ) {
              return null;
            }
            // Only the router calls this, with requests this PDS's plugins
            // built, so their arguments are already well formed.
            // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
            const operation = request.operation as OperationRequest<Queries>;
            try {
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              return queryResponse(
                operation.type,
                await invokeQueryOperation(
                  handlers.queries,
                  ctx,
                  identity,
                  operation,
                ),
              ) as ValidatorTypeToReturnType<OperationResponse<Queries>>;
            } catch {
              return null;
            }
          }),
        ),
    }),
  } as const;
}

function queryResponse(type: string, result: unknown) {
  if (!isRoutedQueryResult(result)) return { type, value: result };
  return {
    ...(result.include.length > 0 ? { include: result.include } : {}),
    routes: result.routes,
    type,
    value: result.data,
  };
}

/** At most this many queries are answered along with another. */
const MAX_INCLUDED_QUERIES = 200;

export function definePdsRouter<DataModel extends GenericDataModel>({
  components,
  mutation,
  query,
}: {
  readonly components: unknown;
  readonly mutation: MutationBuilder<DataModel, "public">;
  readonly query: QueryBuilder<DataModel, "public">;
}) {
  const installed = readDispatcherComponents(components);
  return {
    dispatchMutation: mutation({
      args: {
        lastChanged: v.string(),
        operation: v.any(),
        plugin: v.string(),
        version: v.string(),
      },
      returns: v.any(),
      handler: async (ctx, request) => {
        const component = getDispatcherComponent(installed, request.plugin);
        const identity = await resolveIdentity(ctx);
        const response = await ctx.runMutation(component.mutation, {
          identity,
          lastChanged: request.lastChanged,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          operation: request.operation,
          version: request.version,
        });
        return response.value;
      },
    }),
    dispatchQuery: query({
      args: {
        lastChanged: v.string(),
        operation: v.any(),
        plugin: v.string(),
        version: v.string(),
      },
      returns: v.any(),
      handler: async (ctx, request) => {
        const component = getDispatcherComponent(installed, request.plugin);
        const identity = await resolveIdentity(ctx);
        const response = await ctx.runQuery(component.query, {
          identity,
          lastChanged: request.lastChanged,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          operation: request.operation,
          version: request.version,
        });
        const included = await answerIncluded(
          ctx,
          installed,
          identity,
          response.include ?? [],
        );
        return {
          ...(included.length > 0 ? { included } : {}),
          routes: response.routes ?? [],
          value: response.value,
        };
      },
    }),
  } as const;
}

/**
 * Answers the queries a result includes, one call per plugin, so the
 * client gets them in the same round trip. A plugin that isn't installed,
 * predates included queries, or fails leaves its queries out; the client
 * then asks for them as usual.
 */
async function answerIncluded(
  ctx: Pick<GenericQueryCtx<GenericDataModel>, "runQuery">,
  components: DispatcherComponents,
  identity: DispatcherIdentity | null,
  include: readonly QueryRequest[],
) {
  const byPlugin = new Map<string, QueryRequest[]>();
  for (const request of include.slice(0, MAX_INCLUDED_QUERIES)) {
    byPlugin.set(request.plugin, [
      ...(byPlugin.get(request.plugin) ?? []),
      request,
    ]);
  }
  const answered = await Promise.all(
    [...byPlugin].map(async ([plugin, requests]) => {
      const dispatchQueries = components[plugin]?.dispatcher.dispatchQueries;
      if (dispatchQueries === undefined) return [];
      try {
        const responses = await ctx.runQuery(dispatchQueries, {
          identity,
          requests,
        });
        return requests.flatMap((request, index) => {
          const response = responses[index];
          return response == null
            ? []
            : [
                {
                  request,
                  routes: response.routes ?? [],
                  value: response.value,
                },
              ];
        });
      } catch {
        return [];
      }
    }),
  );
  return answered.flat();
}

function invokeQueryOperation<Operations extends OperationMap, Context>(
  handlers: QueryOperationHandlers<Operations, Context>,
  ctx: Context,
  identity: DispatcherIdentity | null,
  operation: OperationRequest<Operations>,
): MaybePromise<
  | OperationResult<Operations[keyof Operations]>
  | RoutedQueryResult<OperationResult<Operations[keyof Operations]>>
> {
  const handler = handlers[operation.type];
  if (typeof handler !== "function") {
    throw new ConvexError({
      code: "UNKNOWN_PLUGIN_OPERATION",
      operation: operation.type,
    });
  }

  return Reflect.apply(handler, undefined, [
    ctx,
    { args: operation.args, identity },
  ]);
}

function invokeOperation<Operations extends OperationMap, Context>(
  handlers: OperationHandlers<Operations, Context>,
  ctx: Context,
  identity: DispatcherIdentity | null,
  operation: OperationRequest<Operations>,
): MaybePromise<OperationResult<Operations[keyof Operations]>> {
  const handler = handlers[operation.type];
  if (typeof handler !== "function") {
    throw new ConvexError({
      code: "UNKNOWN_PLUGIN_OPERATION",
      operation: operation.type,
    });
  }

  // The discriminated operation validator guarantees this handler receives its matching args.
  return Reflect.apply(handler, undefined, [
    ctx,
    { args: operation.args, identity },
  ]);
}

function readDispatcherComponents(components: unknown): DispatcherComponents {
  // Convex generates `components` as a lazy proxy. Computed property access creates the same
  // FunctionReferences as static `components.myPlugin.dispatcher.*` access.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return components as DispatcherComponents;
}

function getDispatcherComponent(
  components: DispatcherComponents,
  plugin: string,
) {
  const component = components[plugin];
  if (component === undefined) {
    throw new ConvexError({ code: "PLUGIN_NOT_INSTALLED", plugin });
  }
  return {
    mutation: component.dispatcher.dispatchMutation,
    query: component.dispatcher.dispatchQuery,
  };
}

async function resolveIdentity(ctx: {
  readonly auth: Auth;
}): Promise<DispatcherIdentity | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity === null
    ? null
    : {
        ...(typeof identity.accountId === "string"
          ? { accountId: identity.accountId }
          : {}),
        issuer: identity.issuer,
        ...(identity.email === undefined ? {} : { email: identity.email }),
        ...(identity.name === undefined ? {} : { name: identity.name }),
        subject: identity.subject,
        tokenIdentifier: identity.tokenIdentifier,
      };
}
