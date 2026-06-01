"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Snack Requests routes - mirrors SnackRequestsController.cs
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// GET: /api/snackrequests
router.get('/', (_req, res) => {
    const requests = (0, db_1.all)(`SELECT sr.*, u.Email, u.DisplayName, u.ProfilePictureUrl, u.Balance, u.IsAdmin, u.UserId as UserUserId
     FROM SnackRequests sr
     LEFT JOIN Users u ON sr.RequestedByUserId = u.UserId`);
    // Format nested user data for the frontend API contract.
    res.json(requests.map(r => ({
        Id: r.Id,
        SnackName: r.SnackName,
        RequestDate: r.RequestDate,
        Status: r.Status,
        RequestedByUserId: r.RequestedByUserId,
        RequestedByUser: r.UserUserId ? {
            UserId: r.UserUserId,
            Email: r.Email,
            DisplayName: r.DisplayName,
            Balance: r.Balance,
            IsAdmin: !!r.IsAdmin,
            ProfilePictureUrl: r.ProfilePictureUrl,
        } : null,
    })));
});
// POST: /api/snackrequests
router.post('/', (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const { Name } = req.body;
    const now = new Date().toISOString();
    (0, db_1.run)('INSERT INTO SnackRequests (SnackName, RequestedByUserId, RequestDate, Status) VALUES (?, ?, ?, ?)', [Name, req.session.userId, now, 'Pending']);
    const id = (0, db_1.lastInsertRowId)();
    const created = (0, db_1.get)('SELECT * FROM SnackRequests WHERE Id = ?', [id]);
    res.status(201).json(created);
});
// PUT: /api/snackrequests/:id
router.put('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const existing = (0, db_1.get)('SELECT * FROM SnackRequests WHERE Id = ?', [id]);
    if (!existing) {
        return res.status(404).json({ message: 'Snack request not found.' });
    }
    const { SnackName, Status, RequestDate, RequestedByUserId } = req.body;
    (0, db_1.run)('UPDATE SnackRequests SET SnackName = ?, Status = ?, RequestDate = ?, RequestedByUserId = ? WHERE Id = ?', [SnackName || existing.SnackName, Status || existing.Status, RequestDate || existing.RequestDate, RequestedByUserId || existing.RequestedByUserId, id]);
    res.status(204).send();
});
// DELETE: /api/snackrequests/:id
router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const existing = (0, db_1.get)('SELECT * FROM SnackRequests WHERE Id = ?', [id]);
    if (!existing) {
        return res.status(404).json({ message: 'Snack request not found.' });
    }
    (0, db_1.run)('DELETE FROM SnackRequests WHERE Id = ?', [id]);
    res.status(204).send();
});
exports.default = router;
