// Snack Requests routes — mirrors SnackRequestsController.cs
import { Router, Request, Response } from 'express';
import { get, all, run, lastInsertRowId } from '../db';

const router = Router();

// GET: /api/snackrequests
router.get('/', (_req: Request, res: Response) => {
  const requests = all(
    `SELECT sr.*, u.Email, u.DisplayName, u.ProfilePictureUrl, u.Balance, u.IsAdmin, u.UserId as UserUserId
     FROM SnackRequests sr
     LEFT JOIN Users u ON sr.RequestedByUserId = u.UserId`
  );

  // Format to match .NET Include() shape
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
router.post('/', (req: Request, res: Response) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { Name } = req.body;
  const now = new Date().toISOString();

  run(
    'INSERT INTO SnackRequests (SnackName, RequestedByUserId, RequestDate, Status) VALUES (?, ?, ?, ?)',
    [Name, req.session.userId, now, 'Pending']
  );

  const id = lastInsertRowId();
  const created = get('SELECT * FROM SnackRequests WHERE Id = ?', [id]);

  res.status(201).json(created);
});

// PUT: /api/snackrequests/:id
router.put('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const existing = get('SELECT * FROM SnackRequests WHERE Id = ?', [id]);

  if (!existing) {
    return res.status(404).json({ message: 'Snack request not found.' });
  }

  const { SnackName, Status, RequestDate, RequestedByUserId } = req.body;

  run(
    'UPDATE SnackRequests SET SnackName = ?, Status = ?, RequestDate = ?, RequestedByUserId = ? WHERE Id = ?',
    [SnackName || existing.SnackName, Status || existing.Status, RequestDate || existing.RequestDate, RequestedByUserId || existing.RequestedByUserId, id]
  );

  res.status(204).send();
});

// DELETE: /api/snackrequests/:id
router.delete('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const existing = get('SELECT * FROM SnackRequests WHERE Id = ?', [id]);

  if (!existing) {
    return res.status(404).json({ message: 'Snack request not found.' });
  }

  run('DELETE FROM SnackRequests WHERE Id = ?', [id]);
  res.status(204).send();
});

export default router;
