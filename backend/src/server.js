"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Server entry point
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const db_1 = require("./db");
const seed_1 = require("./db/seed");
const weeklyCreditJob_1 = require("./services/weeklyCreditJob");
const auth_1 = __importDefault(require("./routes/auth"));
const snacks_1 = __importDefault(require("./routes/snacks"));
const users_1 = __importDefault(require("./routes/users"));
const admin_1 = __importDefault(require("./routes/admin"));
const snackRequests_1 = __importDefault(require("./routes/snackRequests"));
const PORT = parseInt(process.env.PORT || '3000', 10);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
async function main() {
    // 1. Initialize database
    await (0, db_1.initDb)();
    // 2. Seed database (creates tables, seeds default snacks if empty)
    (0, seed_1.seedDatabase)();
    // 3. Create Express app
    const app = (0, express_1.default)();
    // --- Middleware ---
    // Parse JSON bodies
    app.use(express_1.default.json());
    // Parse cookies
    app.use((0, cookie_parser_1.default)());
    // CORS - allow frontend origin with credentials
    const frontendOrigins = FRONTEND_URL.split(',').map(s => s.trim()).filter(Boolean);
    app.use((0, cors_1.default)({
        origin: frontendOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'Cookie'],
    }));
    // Session cookie used by the snack API.
    app.use((0, express_session_1.default)({
        secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
        name: 'SnackTracker.Auth',
    }));
    // --- Routes ---
    app.use('/api/auth', auth_1.default);
    app.use('/api/snacks', snacks_1.default);
    app.use('/api/users', users_1.default);
    app.use('/api/admin', admin_1.default);
    app.use('/api/snackrequests', snackRequests_1.default);
    // Health check
    app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    // 4. Start weekly credit distribution cron job
    (0, weeklyCreditJob_1.startWeeklyCreditJob)();
    // 5. Start listening
    app.listen(PORT, () => {
        console.log(`\nSnackTracker API (Node.js) listening on http://localhost:${PORT}`);
        console.log(`   Frontend URL: ${FRONTEND_URL}`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
}
main().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
