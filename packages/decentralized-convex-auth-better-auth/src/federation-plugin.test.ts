import assert from "node:assert/strict";
import test from "node:test";
import type { GenericEndpointContext } from "better-auth";

import { convexJwks } from "./federation-plugin.ts";

function key(id: string, createdAt: number, expiresAt?: number) {
  return {
    createdAt,
    id,
    privateKey: "private",
    publicKey: "public",
    ...(expiresAt === undefined ? {} : { expiresAt }),
  };
}

void test("reads stored signing keys back with dates, so several can be sorted", async () => {
  // The Convex adapter returns dates as numbers.
  const stored = [key("new", 2_000), key("old", 1_000, 5_000)];
  const context = {
    context: { adapter: { findMany: () => Promise.resolve(stored) } },
  };
  // A stand-in with only the adapter call `getJwks` makes.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const keys = await convexJwks.getJwks(context as GenericEndpointContext);

  const latest = [...keys].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0];
  assert.equal(latest?.id, "new");
  assert.deepEqual(
    keys.map(({ createdAt, expiresAt }) => [createdAt, expiresAt]),
    [
      [new Date(2_000), undefined],
      [new Date(1_000), new Date(5_000)],
    ],
  );
});
