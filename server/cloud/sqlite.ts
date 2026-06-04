import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { SqlExecutor, SqlQuery, SqlResult, SqlValue } from "./schema.ts";

export function createSqliteExecutor(filePath = ":memory:"): SqlExecutor {
  if (filePath !== ":memory:") mkdirSync(dirname(filePath), { recursive: true });
  const db = new DatabaseSync(filePath);
  db.exec("PRAGMA foreign_keys = ON");
  return {
    async execute(query: SqlQuery): Promise<SqlResult> {
      if (typeof query === "string") {
        if (query.trim().toLowerCase().startsWith("select")) {
          return { rows: db.prepare(query).all() as SqlResult["rows"] };
        }
        db.exec(query);
        return { rows: [], rowsAffected: 0 };
      }
      const statement = db.prepare(query.sql);
      if (returnsRows(query.sql)) {
        return { rows: statement.all(...toSqliteArgs(query.args ?? [])) as SqlResult["rows"] };
      }
      const result = statement.run(...toSqliteArgs(query.args ?? []));
      return { rows: [], rowsAffected: Number(result.changes) };
    }
  };
}

function returnsRows(sql: string) {
  const normalized = sql.trim().toLowerCase();
  return normalized.startsWith("select") || normalized.includes(" returning ");
}

function toSqliteArgs(args: SqlValue[]) {
  return args.map((arg) => typeof arg === "boolean" ? Number(arg) : arg);
}
