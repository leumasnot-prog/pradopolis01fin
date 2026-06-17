// @ts-ignore
import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

declare global {
  var sqliteDb: any;
}

const dbDir = process.env.VERCEL 
  ? "/tmp" 
  : path.join(process.cwd(), "data");

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, "users.db");

if (!globalThis.sqliteDb) {
  try {
    // @ts-ignore
    globalThis.sqliteDb = new DatabaseSync(dbPath);
    
    // Set pragmas for concurrency stability
    try {
      globalThis.sqliteDb.exec("PRAGMA busy_timeout = 5000;");
      globalThis.sqliteDb.exec("PRAGMA journal_mode = WAL;");
    } catch (_) {}

    // Create tables if not exist
    globalThis.sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        approved INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      )
    `);

    // Migration to add 'approved' column in case the database existed before
    try {
      globalThis.sqliteDb.exec("ALTER TABLE users ADD COLUMN approved INTEGER NOT NULL DEFAULT 0");
      console.log("Migration: 'approved' column added to users table.");
    } catch (_) {
      // Column already exists, ignore
    }

    // Clean up old admin user
    try {
      const deleteOldAdmin = globalThis.sqliteDb.prepare("DELETE FROM users WHERE email = ?");
      deleteOldAdmin.run("admin@pradopolis.sp.gov.br");
    } catch (e) {
      // Ignore
    }

    // Seeding new default administrator
    const cryptoModule = require("node:crypto");
    const salt = cryptoModule.randomBytes(16).toString("hex");
    const hash = cryptoModule.scryptSync("pradofin123456", salt, 64).toString("hex");
    const passwordHash = `${salt}:${hash}`;
    
    const insert = globalThis.sqliteDb.prepare(
      "INSERT OR IGNORE INTO users (name, email, password_hash, approved) VALUES (?, ?, ?, 1)"
    );
    insert.run("Contabilidade", "contabilidade@pradopolis.sp.gov.br", passwordHash);
  } catch (err) {
    console.error("Failed to initialize SQLite database:", err);
  }
}

export const db = globalThis.sqliteDb;
