// Snack routes — mirrors SnackController.cs
import { Router, Request, Response } from 'express';
import { get, all, run } from '../db';
import { consumeStock, addBatch } from '../services/inventoryService';

const router = Router();

/** Helper: get admin user from X-User-Id header. */
function getAdminFromHeader(req: Request): Record<string, any> | null {
  const userIdStr = req.headers['x-user-id'] as string | undefined;
  if (!userIdStr) return null;

  const userId = parseInt(userIdStr);
  if (isNaN(userId)) return null;

  const user = get('SELECT * FROM Users WHERE UserId = ?', [userId]);
  if (user && user.IsAdmin) return user;
  return null;
}

// GET: /api/snacks
router.get('/', (_req: Request, res: Response) => {
  const snacks = all('SELECT * FROM Snacks WHERE IsAvailable = 1');
  res.json(snacks.map(s => ({
    SnackId: s.SnackId,
    Name: s.Name,
    Price: s.Price,
    IsAvailable: !!s.IsAvailable,
    Stock: s.Stock,
    ImageUrl: s.ImageUrl,
  })));
});

// POST: /api/snacks/purchase
router.post('/purchase', (req: Request, res: Response) => {
  try {
    const { UserId, SnackId } = req.body;

    const user = get('SELECT * FROM Users WHERE UserId = ?', [UserId]);
    const snack = get('SELECT * FROM Snacks WHERE SnackId = ?', [SnackId]);

    if (!user || !snack) {
      return res.status(404).json({ message: 'User or Snack not found.' });
    }

    if ((snack.Stock as number) <= 0) {
      return res.status(400).json({ message: 'Sorry, this snack is out of stock.' });
    }

    const price = snack.Price as number;

    // 1. Deduct balance
    run('UPDATE Users SET Balance = Balance - ? WHERE UserId = ?', [price, UserId]);

    // 2. Consume stock
    consumeStock(snack.SnackId as number, 1);

    // 3. Record transaction
    const now = new Date().toISOString();
    run(
      'INSERT INTO Transactions (UserId, SnackId, TransactionAmount, Timestamp) VALUES (?, ?, ?, ?)',
      [UserId, SnackId, -price, now]
    );

    const updatedUser = get('SELECT * FROM Users WHERE UserId = ?', [UserId]);
    res.json({ message: 'Purchase successful!', newBalance: updatedUser?.Balance });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

// POST: /api/snacks/checkout
router.post('/checkout', (req: Request, res: Response) => {
  try {
    const { UserId, SnackIds } = req.body as { UserId: number; SnackIds: number[] };

    const user = get('SELECT * FROM Users WHERE UserId = ?', [UserId]);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Fetch all snacks in cart
    if (!SnackIds || SnackIds.length === 0) {
      return res.status(400).json({ message: 'Cart is empty.' });
    }

    const placeholders = SnackIds.map(() => '?').join(',');
    const snacksInCart = all(`SELECT * FROM Snacks WHERE SnackId IN (${placeholders})`, SnackIds);

    let totalCost = 0;
    let waterDiscountApplied = false;

    // Check if user already purchased water today
    const today = new Date().toISOString().split('T')[0];
    const hasPurchasedWaterToday = get(
      `SELECT t.TransactionId FROM Transactions t 
       JOIN Snacks s ON t.SnackId = s.SnackId 
       WHERE t.UserId = ? AND LOWER(s.Name) = 'water' AND date(t.Timestamp) = ?`,
      [UserId, today]
    );

    interface PurchaseItem {
      snack: Record<string, any>;
      priceAtCheckout: number;
    }
    const purchaseItems: PurchaseItem[] = [];

    // Validate all items first
    for (const snackId of SnackIds) {
      const snack = snacksInCart.find(s => s.SnackId === snackId);
      if (!snack) {
        return res.status(400).json({ message: `Snack with ID ${snackId} not found.` });
      }
      if ((snack.Stock as number) <= 0) {
        return res.status(400).json({ message: `Sorry, '${snack.Name}' is out of stock.` });
      }

      // First Water is Free rule
      if (
        (snack.Name as string).toLowerCase() === 'water' &&
        !hasPurchasedWaterToday &&
        !waterDiscountApplied
      ) {
        waterDiscountApplied = true;
        purchaseItems.push({ snack, priceAtCheckout: 0.00 });
      } else {
        totalCost += snack.Price as number;
        purchaseItems.push({ snack, priceAtCheckout: snack.Price as number });
      }
    }

    // Check balance
    if ((user.Balance as number) < totalCost) {
      return res.status(400).json({
        message: `Insufficient funds. Your balance is $${(user.Balance as number).toFixed(2)}, but the cart total is $${totalCost.toFixed(2)}.`,
      });
    }

    // Execute changes
    run('UPDATE Users SET Balance = Balance - ? WHERE UserId = ?', [totalCost, UserId]);

    const now = new Date().toISOString();
    for (const item of purchaseItems) {
      run(
        'INSERT INTO Transactions (UserId, SnackId, TransactionAmount, Timestamp) VALUES (?, ?, ?, ?)',
        [UserId, item.snack.SnackId, -item.priceAtCheckout, now]
      );
      consumeStock(item.snack.SnackId as number, 1);
    }

    const updatedUser = get('SELECT * FROM Users WHERE UserId = ?', [UserId]);
    res.json({ message: 'Checkout successful!', newBalance: updatedUser?.Balance });
  } catch (err: any) {
    res.status(500).json({ message: 'An error occurred during checkout: ' + err.message });
  }
});

// POST: /api/snacks/:id/restock
router.post('/:id/restock', (req: Request, res: Response) => {
  const adminUser = getAdminFromHeader(req);
  if (!adminUser) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const snackId = parseInt(req.params.id);
    const { Quantity, TotalCost } = req.body;
    addBatch(snackId, Quantity, TotalCost);
    res.json({ message: 'Restock successful. Price updated.' });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
