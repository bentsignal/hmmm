---
name: typescript
description: TypeScript coding standards for this project. Use when writing or modifying TypeScript files.
---

# TypeScript

These are the TypeScript standards for this project. Follow them when writing or modifying any TypeScript code.

## Const Assertions

Use `as const` to preserve exact literal types and `readonly`. This is the one acceptable use of `as` since it tightens types rather than loosening them.

- Use on configuration objects, lookup maps, and any data that defines a fixed set of values.
- Use on arrays that represent a known set of options, then derive union types: `type Status = (typeof STATUS)[number]`.
- Prefer `as const` over manually writing literal union types when the source of truth is an array or object.
- Pair with `satisfies` when you need both exact literal types and structural validation.

```typescript
const STATUS = ["idle", "loading", "success", "error"] as const;
type Status = (typeof STATUS)[number];

const PLAN_LIMITS = {
  free: { projects: 3, storage: 500 },
  pro: { projects: 50, storage: 10_000 },
} as const satisfies Record<string, Record<string, number>>;

type Plan = keyof typeof PLAN_LIMITS;
```

## Early Returns

- Guard against invalid or edge-case inputs at the top of the function and return/throw immediately.
- In multi-step transformations, validate and bail out between each step rather than wrapping everything in nested conditionals.
- This directly improves type narrowing — each early return eliminates a possibility, giving tighter types for the code that follows.

## Discriminated Unions & Narrowing

Model variants explicitly so the compiler forces you to handle each case.

- Use a shared literal field (the discriminant) to distinguish between variants. Common discriminants: `type`, `status`, `kind`.
- Narrow using `if`/`switch` on the discriminant, not by checking for optional field existence.
- Avoid modeling variants as a single type with many optional fields — this forces consumers to handle impossible combinations.
- Prefer `switch` with exhaustiveness checking when there are three or more variants. The linter enforces exhaustive `switch` statements.

```typescript
type Result =
  | { status: "success"; data: Order }
  | { status: "error"; error: string };

function handleResult(result: Result) {
  switch (result.status) {
    case "success":
      return processOrder(result.data);
    case "error":
      return reportError(result.error);
  }
}
```

## Inference Over Annotation

- Never annotate a variable when the right-hand side already tells the compiler the type.
- Function parameters are the exception — they have no value to infer from, so explicit types are expected.
- Heavy annotations are a signal that the code structure should be rethought, not papered over with types.

## Prohibited patterns

- **No re-export shims.** When moving a function to a new module, update every import site to point to the new location. Never import a function into the old file and re-export it (under the same or a different name) just to avoid updating consumers. This creates indirection that makes the codebase harder to reason about and defeats the purpose of the refactor. The same applies to functions that are one line and simply just call another function. These add unnecessary complexity and should always be avoided.
