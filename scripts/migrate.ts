import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pool } from "../lib/db";

async function main() {
  const sql = readFileSync(join(process.cwd(), "schema.sql"), "utf8");
  await pool.query(sql);
  await pool.end();
  console.log("schema applied");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
