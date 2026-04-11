---
name: shopify
description: Use whenever the scope of your task touches the shopify package or its uses anywhere in the project.
---

This project uses Shopify headless. `@acme/shopify` is configured so that GraphQL queries written inside the package will have TypeScript types generated for them.

As you are working on any Shopify/GraphQL code in this project, make sure you STRICTLY adhere to the principles listed below. If you think there might actually be a valid use case for breaking them, pause and confirm first with the user.

## Principles

- Since the Shopify package generates types for the GraphQL queries written in it, you should ALWAYS write GraphQL queries inside the shopify package. Writing them directly in the app code will not result in generated types and will therefore not give you any type safety.
- You should always rely on type inference for getting the types of the data returned from GraphQL queries. You should NEVER have to use generics or type casting on the GraphQL operations being called from the app code.
- **AVOID AT ALL COSTS** normalizing the data returned from the GraphQL queries. You should not need to write custom functions to transform the data returned from them into a custom shape defined in the app code. You should ALWAYS rely on the types generated from the shopify package.

## Required Actions

After creating or modifying any GraphQL queries in the shopify package, you must always run:

`pnpm --filter @acme/shopify run build`
