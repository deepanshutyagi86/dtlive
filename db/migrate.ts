// Applies db/schema.sql against DATABASE_URL. Run with `npm run db:push`.
import { readFileSync } from "fs";
import { join } from "path";
import { sql } from "../src/lib/db";

async function main() {
  const schema = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
  // @vercel/postgres doesn't support multi-statement strings in one call,
  // so split on semicolons at line-ends and run each statement in turn.
  const statements = schema
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql(statement);
    console.log("✓", statement.split("\n")[0].slice(0, 60));
  }
  console.log("Schema applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
