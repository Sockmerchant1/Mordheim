import { connect } from "@tursodatabase/serverless";
import { applySchema } from "./schema.mjs";

const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN } = process.env;

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN before applying the schema.");
}

const conn = connect({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN });
await applySchema(conn);
console.log("Applied Turso schema and seeded autumn-in-the-city.");
