import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const DB_PATH = path.resolve(process.cwd(), process.env.DB_PATH ?? "./db/incidents.sqlite");

declare global {
  // eslint-disable-next-line no-var
  var __incidentsDb: Database.Database | undefined;
}

/** Opens (and if needed creates) the database. One shared connection per process. */
export function openDb(file = DB_PATH): Database.Database {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(path.join(process.cwd(), "lib/server/schema.sql"), "utf8"));
  return db;
}

export function getDb(): Database.Database {
  if (!globalThis.__incidentsDb) globalThis.__incidentsDb = openDb();
  return globalThis.__incidentsDb;
}
