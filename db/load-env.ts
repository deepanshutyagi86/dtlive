// db/migrate.ts and db/seed.ts run standalone via `tsx`, outside of Next's
// dev/build process, so Next's automatic .env loading never happens for
// them. Import this first, before anything that reads process.env (like
// src/lib/db.ts, which calls neon(process.env.DATABASE_URL!) at module
// load time), to replicate Next's own precedence: .env.local overrides
// .env. https://nextjs.org/docs/app/building-your-application/configuring/environment-variables#environment-variable-load-order
import { config } from "dotenv";
import { join } from "path";

config({ path: join(process.cwd(), ".env") });
config({ path: join(process.cwd(), ".env.local"), override: true });
