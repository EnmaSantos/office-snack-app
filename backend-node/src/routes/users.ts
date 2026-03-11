// User routes — mirrors UsersController.cs
import { Router, Request, Response } from 'express';
import { get, all, run } from '../db';

const router = Router();

/** Middleware: require authenticated session. */
function requireAuth(req: Request, res: Response, next: Function): void {
  if (!req.session?.userId) {
    res.status(401).json({ message: 'Invalid user token.' });
    return;
  }
  next();
}

// POST: /api/users/add-balance
router.post('/add-balance', requireAuth, (req: Request, res: Response) => {
  const userId = req.session.userId!;
  const { Amount } = req.body;

  const user = get('SELECT * FROM Users WHERE UserId = ?', [userId]);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  run('UPDATE Users SET Balance = Balance + ? WHERE UserId = ?', [Amount, userId]);

  const now = new Date().toISOString();
  run(
    'INSERT INTO Transactions (UserId, SnackId, TransactionAmount, Timestamp) VALUES (?, NULL, ?, ?)',
    [userId, Amount, now]
  );

  const updatedUser = get('SELECT * FROM Users WHERE UserId = ?', [userId]);
  res.json({ message: 'Balance updated successfully.', newBalance: updatedUser?.Balance });
});

// GET: /api/users/transactions
router.get('/transactions', requireAuth, (req: Request, res: Response) => {
  const userId = req.session.userId!;

  const transactions = all(
    `SELECT t.TransactionId, t.TransactionAmount, t.Timestamp,
            s.Name as SnackName, s.Price as SnackPrice, s.ImageUrl as SnackImageUrl
     FROM Transactions t
     LEFT JOIN Snacks s ON t.SnackId = s.SnackId
     WHERE t.UserId = ?
     ORDER BY t.Timestamp DESC`,
    [userId]
  );

  res.json(transactions);
});

export default router;
