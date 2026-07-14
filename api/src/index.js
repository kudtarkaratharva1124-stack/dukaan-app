import app from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./config/db.js";

async function start() {
  try {
    await pool.query("SELECT 1"); // fail fast if the DB isn't reachable
    app.listen(env.port, () => {
      console.log(`DukaanPro API listening on port ${env.port} [${env.nodeEnv}]`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
