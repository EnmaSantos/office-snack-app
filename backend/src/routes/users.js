"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// User routes - mirrors UsersController.cs
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
/** Middleware: require authenticated session. */
function requireAuth(req, res, next) {
    if (!req.session?.userId) {
        res.status(401).json({ message: 'Invalid user token.' });
        return;
    }
    next();
}
// POST: /api/users/add-balance
router.post('/add-balance', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const { Amount } = req.body;
    const user = (0, db_1.get)('SELECT * FROM Users WHERE UserId = ?', [userId]);
    if (!user) {
        return res.status(404).json({ message: 'User not found.' });
    }
    (0, db_1.run)('UPDATE Users SET Balance = Balance + ? WHERE UserId = ?', [Amount, userId]);
    const now = new Date().toISOString();
    (0, db_1.run)('INSERT INTO Transactions (UserId, SnackId, TransactionAmount, Timestamp) VALUES (?, NULL, ?, ?)', [userId, Amount, now]);
    const updatedUser = (0, db_1.get)('SELECT * FROM Users WHERE UserId = ?', [userId]);
    res.json({ message: 'Balance updated successfully.', newBalance: updatedUser?.Balance });
});
// GET: /api/users/transactions
router.get('/transactions', requireAuth, (req, res) => {
    const userId = req.session.userId;
    const transactions = (0, db_1.all)(`SELECT t.TransactionId, t.TransactionAmount, t.Timestamp,
            s.Name as SnackName, s.Price as SnackPrice, s.ImageUrl as SnackImageUrl
     FROM Transactions t
     LEFT JOIN Snacks s ON t.SnackId = s.SnackId
     WHERE t.UserId = ?
     ORDER BY t.Timestamp DESC`, [userId]);
    res.json(transactions);
});
exports.default = router;
