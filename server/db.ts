import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let db: Database.Database | null = null;
const uploadDir = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const defaultDbPath = path.resolve(process.cwd(), "attached_assets", "pos_1771576397582.db");
if (fs.existsSync(defaultDbPath)) {
  db = new Database(defaultDbPath, { readonly: true });
}

export function getDb(): Database.Database | null {
  return db;
}

export function loadDatabase(filePath: string): void {
  if (db) {
    try { db.close(); } catch (_) {}
  }
  db = new Database(filePath, { readonly: true });
}

export function isDbLoaded(): boolean {
  return db !== null;
}

export function getUploadDir(): string {
  return uploadDir;
}
