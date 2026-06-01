"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = initDb;
exports.saveDb = saveDb;
exports.run = run;
exports.all = all;
exports.get = get;
exports.exec = exec;
exports.lastInsertRowId = lastInsertRowId;
// Database connection using sql.js (pure JavaScript SQLite)
const sql_js_1 = __importDefault(require("sql.js"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let _db = null;
let _dbPath = '';
/**
 * Initialize and return the SQLite database instance.
 */
async function initDb() {
    if (_db)
        return;
    _dbPath = path_1.default.resolve(process.cwd(), process.env.DATABASE_PATH || './SnackTracker.db');
    // Provide the WASM binary path explicitly
    const wasmPath = path_1.default.join(path_1.default.dirname(require.resolve('sql.js')), 'sql-wasm.wasm');
    const SQL = await (0, sql_js_1.default)({
        locateFile: () => wasmPath,
    });
    if (fs_1.default.existsSync(_dbPath)) {
        const fileBuffer = fs_1.default.readFileSync(_dbPath);
        _db = new SQL.Database(fileBuffer);
        console.log(`Database loaded from: ${_dbPath}`);
    }
    else {
        // Ensure directory exists
        const dir = path_1.default.dirname(_dbPath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
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
function saveDb() {
    if (!_db)
        return;
    const data = _db.export();
    const buffer = Buffer.from(data);
    fs_1.default.writeFileSync(_dbPath, buffer);
}
/**
 * Run a query that modifies data (INSERT, UPDATE, DELETE).
 * Automatically saves to disk after modification.
 */
function run(sql, params = []) {
    if (!_db)
        throw new Error('Database not initialized. Call initDb() first.');
    _db.run(sql, params);
    saveDb();
}
/**
 * Run a SELECT query and return all matching rows as an array of objects.
 */
function all(sql, params = []) {
    if (!_db)
        throw new Error('Database not initialized. Call initDb() first.');
    const stmt = _db.prepare(sql);
    if (params.length > 0)
        stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}
/**
 * Run a SELECT query and return the first matching row, or null.
 */
function get(sql, params = []) {
    const rows = all(sql, params);
    return rows.length > 0 ? rows[0] : null;
}
/**
 * Execute raw SQL (DDL, multi-statement). Saves to disk.
 */
function exec(sql) {
    if (!_db)
        throw new Error('Database not initialized. Call initDb() first.');
    _db.exec(sql);
    saveDb();
}
/**
 * Get the last inserted row ID.
 */
function lastInsertRowId() {
    const row = get('SELECT last_insert_rowid() as id');
    return row ? row.id : null;
}
