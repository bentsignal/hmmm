export { decentralizedConvexPackage } from "../metadata.ts";
export {
  definePdsApp,
  definePdsPluginComponent,
  pdsDescriptorFromApp,
  pdsReleaseFromApp,
  protocolsFromPdsApp,
  protocolCapabilities,
} from "./app.ts";
export type {
  AnyPdsPluginComponent,
  ComponentInstall,
  PdsAuthAdapter,
  PdsAppDefinition,
  PdsAppOptions,
  PdsPluginComponent,
  PdsPluginsOf,
  PdsProtocolsOf,
  PluginProtocolOf,
  PluginProtocolsOf,
} from "./app.ts";
export {
  FEDERATION_DESCRIPTOR_PATH,
  federationDescriptorResponse,
  registerFederationRoutes,
} from "./descriptor.ts";
export type {
  FederationAuthDescriptor,
  FederationCapability,
  FederationDescriptor,
  RegisterFederationRoutesOptions,
} from "./descriptor.ts";
export { defineComponentDispatchers, definePdsRouter } from "./dispatcher.ts";
export type {
  DispatcherIdentity,
  OperationHandlerContext,
  OperationHandlers,
  PdsRouterMutation,
  PdsRouterMutationRequest,
  QueryOperationHandlers,
} from "./dispatcher.ts";
export { queryResult, routedQueryResult } from "./routed-query.ts";
export type { RoutedQueryResult } from "./routed-query.ts";
