import { connect } from "@tursodatabase/serverless";
import type { SqlExecutor, SqlQuery, SqlResult } from "./schema.ts";

export function createTursoExecutor(): SqlExecutor {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required.");
  }
  const conn = connect({ url, authToken });
  return {
    async execute(query: SqlQuery): Promise<SqlResult> {
      if (typeof query === "string") {
        const stmt = await conn.prepare(query);
        if (stmt.reader) {
          const rows = await stmt.all();
          return { rows: rows as unknown as SqlResult["rows"] };
        }
        const result = await stmt.run();
        return { rows: [], rowsAffected: Number(result.rowsAffected ?? result.changes ?? 0) };
      }
      const stmt = await conn.prepare(query.sql);
      if (stmt.reader) {
        const rows = await stmt.all(query.args ?? []);
        return { rows: rows as unknown as SqlResult["rows"] };
      }
      const result = await stmt.run(query.args ?? []);
      return { rows: [], rowsAffected: Number(result.rowsAffected ?? result.changes ?? 0) };
    }
  };
}
