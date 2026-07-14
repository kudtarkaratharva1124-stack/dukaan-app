import pg from "pg";
import { env } from "./env.js";

export const pool = new pg.Pool({
  connectionString: env.databaseUrl
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle Postgres client", err);
});

// Small helper so controllers don't import pg directly everywhere.
export const query = (text, params) => pool.query(text, params);

// Run several queries inside a single transaction.
export const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
