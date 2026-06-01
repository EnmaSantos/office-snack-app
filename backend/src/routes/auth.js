"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Auth routes - mirrors AuthController.cs
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
/** Format a user row for the frontend API contract. */
function formatUser(user) {
    return {
        UserId: user.UserId,
        Email: user.Email,
        DisplayName: user.DisplayName,
        Balance: user.Balance,
        IsAdmin: !!user.IsAdmin,
        ProfilePictureUrl: user.ProfilePictureUrl,
    };
}
// POST: /api/auth/sync-main-site
router.post('/sync-main-site', async (req, res) => {
    try {
        const mainSiteUrl = process.env.MAIN_SITE_URL || 'https://ftcemp.byui.edu';
        const cookieHeader = req.headers.cookie || '';
        const response = await fetch(`${mainSiteUrl}/auth/status`, {
            headers: cookieHeader ? { Cookie: cookieHeader } : {},
        });
        if (!response.ok) {
            return res.status(401).json({ message: 'Not authenticated on main site' });
        }
        const authStatus = await response.json();
        if (!authStatus || !authStatus.isAuthenticated || !authStatus.user) {
            return res.status(401).json({ message: 'Not authenticated on main site' });
        }
        const email = authStatus.user.email;
        const displayName = authStatus.user.displayName || null;
        const profilePictureUrl = authStatus.user.profilePhoto || null;
        if (!email) {
            return res.status(400).json({ message: 'Email not found in main site auth' });
        }
        let user = (0, db_1.get)('SELECT * FROM Users WHERE Email = ?', [email]);
        if (!user) {
            (0, db_1.run)('INSERT INTO Users (Email, DisplayName, ProfilePictureUrl) VALUES (?, ?, ?)', [email, displayName, profilePictureUrl]);
            const userId = (0, db_1.lastInsertRowId)();
            user = (0, db_1.get)('SELECT * FROM Users WHERE UserId = ?', [userId]);
        }
        else {
            let updated = false;
            if (user.DisplayName !== displayName) {
                (0, db_1.run)('UPDATE Users SET DisplayName = ? WHERE UserId = ?', [displayName, user.UserId]);
                updated = true;
            }
            if (user.ProfilePictureUrl !== profilePictureUrl) {
                (0, db_1.run)('UPDATE Users SET ProfilePictureUrl = ? WHERE UserId = ?', [profilePictureUrl, user.UserId]);
                updated = true;
            }
            if (updated) {
                user = (0, db_1.get)('SELECT * FROM Users WHERE UserId = ?', [user.UserId]);
            }
        }
        if (!user) {
            return res.status(500).json({ message: 'Failed to create or find user' });
        }
        req.session.userId = user.UserId;
        res.json(formatUser(user));
    }
    catch (err) {
        console.error('Auth sync error:', err);
        res.status(500).json({ message: 'Error syncing with main site', error: err.message });
    }
});
// GET: /api/auth/me
router.get('/me', (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    const user = (0, db_1.get)('SELECT * FROM Users WHERE UserId = ?', [req.session.userId]);
    if (!user) {
        return res.status(401).json({ message: 'User not found' });
    }
    res.json(formatUser(user));
});
// GET: /api/auth/signout
router.get('/signout', (req, res) => {
    req.session.destroy(() => {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(frontendUrl);
    });
});
// POST: /api/auth/toggle-admin/:userId (DEV ONLY)
router.post('/toggle-admin/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const user = (0, db_1.get)('SELECT * FROM Users WHERE UserId = ?', [userId]);
    if (!user) {
        return res.status(404).json({ message: 'User not found.' });
    }
    const newIsAdmin = user.IsAdmin ? 0 : 1;
    (0, db_1.run)('UPDATE Users SET IsAdmin = ? WHERE UserId = ?', [newIsAdmin, userId]);
    const updated = (0, db_1.get)('SELECT * FROM Users WHERE UserId = ?', [userId]);
    if (!updated) {
        return res.status(500).json({ message: 'Failed to update user' });
    }
    res.json({
        message: `User ${updated.DisplayName} is now ${updated.IsAdmin ? 'an admin' : 'a regular user'}`,
        user: formatUser(updated),
    });
});
exports.default = router;
