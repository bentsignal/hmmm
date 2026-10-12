import type { MutationCtx } from "./_generated/server.js";

// Tests only: just enough of Convex's database for the queries and writes
// the tests exercise, over in-memory rows.

type Row = Record<string, unknown> & { _creationTime: number; _id: string };
type Filter = (row: Row) => boolean;

const INDEXES: Record<string, Record<string, string[]>> = {
  activitySightings: {
    by_account_key: ["accountId", "key", "seenAt"],
    by_account_seen: ["accountId", "seenAt"],
  },
  conversations: {
    by_conversation: ["conversationId"],
    by_space: ["spaceId"],
  },
  members: {
    by_account: ["accountId"],
    by_conversation_account: ["conversationId", "accountId"],
  },
  messages: {
    by_conversation_sent: ["conversationId", "sentAt"],
    by_message: ["messageId"],
  },
  reactions: {
    by_author_reacted: ["messageAuthorId", "reactedAt"],
    by_message: ["messageId"],
  },
  spaceInvites: {
    by_account: ["accountId"],
    by_space_account: ["spaceId", "accountId"],
  },
  spaceMembers: {
    by_account: ["accountId"],
    by_space_account: ["spaceId", "accountId"],
  },
  spaces: { by_space: ["spaceId"] },
};

function compare(left: unknown, right: unknown) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right));
}

/**
 * A fake context holding `tables`. It reads and writes like a mutation's,
 * so it also stands in for a query's. `rows` reads a table back.
 */
export function fakeCtx(tables: Record<string, Record<string, unknown>[]>) {
  let clock = 0;
  const rows: Record<string, Row[]> = {};
  function insert(table: string, value: Record<string, unknown>) {
    const row = { _creationTime: (clock += 1), _id: `${table}:${clock}` };
    (rows[table] ??= []).push({ ...row, ...value });
    return row._id;
  }
  for (const [table, values] of Object.entries(tables)) {
    for (const value of values) insert(table, value);
  }

  function select(table: string, index: string, filters: Filter[]) {
    const fields = INDEXES[table]?.[index];
    if (fields === undefined) throw new Error(`No index ${table}.${index}`);
    return (rows[table] ?? [])
      .filter((row) => filters.every((filter) => filter(row)))
      .sort((left, right) => {
        for (const field of [...fields, "_creationTime"]) {
          const order = compare(left[field], right[field]);
          if (order !== 0) return order;
        }
        return 0;
      });
  }

  function range() {
    const filters: Filter[] = [];
    const builder = {
      eq: (field: string, value: unknown) => {
        filters.push((row) => row[field] === value);
        return builder;
      },
      gt: (field: string, value: number) => {
        filters.push((row) => Number(row[field]) > value);
        return builder;
      },
      lt: (field: string, value: number) => {
        filters.push((row) => Number(row[field]) < value);
        return builder;
      },
      filters,
    };
    return builder;
  }

  function results(found: Row[]) {
    return {
      [Symbol.asyncIterator]: async function* () {
        yield* found;
        await Promise.resolve();
      },
      collect: () => Promise.resolve(found),
      first: () => Promise.resolve(found[0] ?? null),
      order: (direction: "asc" | "desc") =>
        results(direction === "desc" ? [...found].reverse() : found),
      take: (count: number) => Promise.resolve(found.slice(0, count)),
      unique: () => {
        if (found.length > 1) throw new Error("Not unique");
        return Promise.resolve(found[0] ?? null);
      },
    };
  }

  const ctx = {
    db: {
      delete: (id: string) => {
        const table = id.slice(0, id.indexOf(":"));
        rows[table] = (rows[table] ?? []).filter((row) => row._id !== id);
        return Promise.resolve();
      },
      insert: (table: string, value: Record<string, unknown>) =>
        Promise.resolve(insert(table, value)),
      query: (table: string) => ({
        withIndex: (
          index: string,
          build: (builder: ReturnType<typeof range>) => unknown,
        ) => {
          const builder = range();
          build(builder);
          return results(select(table, index, builder.filters));
        },
      }),
    },
  };
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- A partial fake of the Convex database.
  const fake = ctx as unknown as MutationCtx;
  return {
    ctx: fake,
    rows: (table: string) => rows[table] ?? [],
  };
}
