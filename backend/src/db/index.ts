// Database connection using sql.js (pure JavaScript SQLite)
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

type SqlJsDatabase = ReturnType<Awaited<ReturnType<typeof initSqlJs>>['Database']['prototype']['constructor']> extends never
  ? any
  : any;

let _db: any = null;
let _dbPath: string = '';

/**
 * Initialize and return the SQLite database instance.
 */
export async function initDb(): Promise<void> {
  if (_db) return;

  _dbPath = path.resolve(process.cwd(), process.env.DATABASE_PATH || './SnackTracker.db');
  
  // Provide the WASM binary path explicitly
  const wasmPath = path.join(
    path.dirname(require.resolve('sql.js')),
    'sql-wasm.wasm'
  );
  
  const SQL = await initSqlJs({
    locateFile: () => wasmPath,
  } as any);

  if (fs.existsSync(_dbPath)) {
    const fileBuffer = fs.readFileSync(_dbPath);
    _db = new SQL.Database(fileBuffer);
    console.log(`Database loaded from: ${_dbPath}`);
  } else {
    // Ensure directory exists
    const dir = path.dirname(_dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    _db = new SQL.Database();
    console.log(`New database created (will save to: ${_dbPath})`);
  }

  // Enable WAL mode and foreign keys
  _db.run('PRAGMA journal_mode=WAL');
  _db.run('PRAGMA foreign_keys=ON');
}

/**
 * Save the in-memory database to disk.
 */
export function saveDb(): void {
  if (!_db) return;
  const data = _db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(_dbPath, buffer);
}

/**
 * Run a query that modifies data (INSERT, UPDATE, DELETE).
 * Automatically saves to disk after modification.
 */
export function run(sql: string, params: any[] = []): void {
  if (!_db) throw new Error('Database not initialized. Call initDb() first.');
  _db.run(sql, params);
  saveDb();
}

/**
 * Run a SELECT query and return all matching rows as an array of objects.
 */
export function all(sql: string, params: any[] = []): Record<string, any>[] {
  if (!_db) throw new Error('Database not initialized. Call initDb() first.');
  const stmt = _db.prepare(sql);
  if (params.length > 0) stmt.bind(params);

  const rows: Record<string, any>[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Run a SELECT query and return the first matching row, or null.
 */
export function get(sql: string, params: any[] = []): Record<string, any> | null {
  const rows = all(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute raw SQL (DDL, multi-statement). Saves to disk.
 */
export function exec(sql: string): void {
  if (!_db) throw new Error('Database not initialized. Call initDb() first.');
  _db.exec(sql);
  saveDb();
}

/**
 * Get the last inserted row ID.
 */
export function lastInsertRowId(): number | null {
  const row = get('SELECT last_insert_rowid() as id');
  return row ? (row.id as number) : null;
}
