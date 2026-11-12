import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

/**
 * Opens a database connection for one request. Hyperdrive keeps the real connections pooled, so a
 * new client per request is cheap. Caching stays off for live order data (architecture.md 14.2).
 */
export async function connect(env: Env): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
  let ended = false;
  // After end(), pg's Workers socket can still report "This socket has been closed" while its
  // reader stops. That's expected then and is ignored; any other error is logged.
  client.on("error", (e) => {
    if (!ended) console.error("Database connection error", e);
  });
  await client.connect();
  return {
    db: drizzle(client, { schema, casing: "snake_case" }),
    close: () => {
      ended = true;
      return client.end();
    },
  };
}
