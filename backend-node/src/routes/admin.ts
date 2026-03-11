// Admin routes — mirrors AdminController.cs
import { Router, Request, Response } from 'express';
import { get, all, run, lastInsertRowId } from '../db';
import { addBatch } from '../services/inventoryService';
import { getSheetNames, getWeeklyHours } from '../services/googleSheetsService';
import PDFDocument from 'pdfkit';

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

// ─── USER MANAGEMENT ────────────────────────────────────────────────

// GET: /api/admin/sheet-names
router.get('/sheet-names', async (req: Request, res: Response) => {
  const admin = getAdminFromHeader(req);
  if (!admin) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const names = await getSheetNames();
    res.json(names);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching Google Sheets tabs: ' + err.message });
  }
});

// POST: /api/admin/distribute-weekly-credits
router.post('/distribute-weekly-credits', async (req: Request, res: Response) => {
  const admin = getAdminFromHeader(req);
  if (!admin) return res.status(401).json({ message: 'Unauthorized' });

  const { WeekSheetName } = req.body;
  if (!WeekSheetName) {
    return res.status(400).json({ message: 'Sheet name is required.' });
  }

  try {
    const weeklyHours = await getWeeklyHours(WeekSheetName);

    if (Object.keys(weeklyHours).length === 0) {
      return res.status(400).json({ message: `No hours found in sheet '${WeekSheetName}'.` });
    }

    let usersUpdated = 0;
    let totalCreditsDistributed = 0;

    const allUsers = all('SELECT * FROM Users');
    const now = new Date().toISOString();

    for (const [sheetName, hours] of Object.entries(weeklyHours)) {
      const creditsToAward = Math.floor(hours / 4) * 1.0;
      if (creditsToAward <= 0) continue;

      const user = allUsers.find(u =>
        u.DisplayName &&
        (u.DisplayName as string).toLowerCase() === sheetName.toLowerCase()
      );

      if (user) {
        run('UPDATE Users SET Balance = Balance + ? WHERE UserId = ?', [creditsToAward, user.UserId]);
        run(
          'INSERT INTO Transactions (UserId, SnackId, TransactionAmount, Timestamp) VALUES (?, NULL, ?, ?)',
          [user.UserId, creditsToAward, now]
        );
        usersUpdated++;
        totalCreditsDistributed += creditsToAward;
      }
    }

    // Log the manual distribution
    run(
      'INSERT INTO DistributionLogs (WeekSheetName, DistributedAt, UsersUpdated, TotalAmount, IsAutomatic) VALUES (?, ?, ?, ?, 0)',
      [WeekSheetName, now, usersUpdated, totalCreditsDistributed]
    );

    res.json({
      message: 'Credits distributed successfully.',
      usersUpdated,
      totalDistributed: totalCreditsDistributed,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Error distributing credits: ' + err.message });
  }
});

// GET: /api/admin/users
router.get('/users', (req: Request, res: Response) => {
  const admin = getAdminFromHeader(req);
  if (!admin) return res.status(401).json({ message: 'Unauthorized' });

  const users = all('SELECT * FROM Users ORDER BY DisplayName');
  res.json(users.map(u => ({
    UserId: u.UserId,
    Email: u.Email,
    DisplayName: u.DisplayName,
    Balance: u.Balance,
    IsAdmin: !!u.IsAdmin,
    ProfilePictureUrl: u.ProfilePictureUrl,
  })));
});

// POST: /api/admin/adjust-balance
router.post('/adjust-balance', (req: Request, res: Response) => {
  const admin = getAdminFromHeader(req);
  if (!admin) return res.status(401).json({ message: 'Unauthorized' });

  const { UserId, Amount } = req.body;
  const user = get('SELECT * FROM Users WHERE UserId = ?', [UserId]);
  if (!user) return res.status(404).json({ message: 'User to adjust not found.' });

  run('UPDATE Users SET Balance = Balance + ? WHERE UserId = ?', [Amount, UserId]);

  const now = new Date().toISOString();
  run(
    'INSERT INTO Transactions (UserId, SnackId, TransactionAmount, Timestamp) VALUES (?, NULL, ?, ?)',
    [UserId, Amount, now]
  );

  const updated = get('SELECT * FROM Users WHERE UserId = ?', [UserId]);
  res.json({ message: 'Balance updated successfully.', newBalance: updated?.Balance });
});

// POST: /api/admin/toggle-admin-status
router.post('/toggle-admin-status', (req: Request, res: Response) => {
  const admin = getAdminFromHeader(req);
  if (!admin) return res.status(401).json({ message: 'Unauthorized' });

  const { UserId } = req.body;
  const user = get('SELECT * FROM Users WHERE UserId = ?', [UserId]);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  if (user.UserId === admin.UserId) {
    return res.status(400).json({ message: 'You cannot change your own admin status.' });
  }

  const newIsAdmin = user.IsAdmin ? 0 : 1;
  run('UPDATE Users SET IsAdmin = ? WHERE UserId = ?', [newIsAdmin, UserId]);

  const updated = get('SELECT * FROM Users WHERE UserId = ?', [UserId]);
  res.json({
    message: `User ${updated?.DisplayName} is now ${updated?.IsAdmin ? 'an admin' : 'a regular user'}.`,
    isAdmin: !!updated?.IsAdmin,
  });
});

// GET: /api/admin/user-stats/:userId
router.get('/user-stats/:userId', (req: Request, res: Response) => {
  const admin = getAdminFromHeader(req);
  if (!admin) return res.status(401).json({ message: 'Unauthorized' });

  const userId = parseInt(req.params.userId);
  const userExists = get('SELECT UserId FROM Users WHERE UserId = ?', [userId]);
  if (!userExists) return res.status(404).json({ message: 'User not found.' });

  try {
    // Most bought items
    const mostBought = all(
      `SELECT SnackId, COUNT(*) as PurchaseCount, SUM(-TransactionAmount) as TotalSpent
       FROM Transactions
       WHERE UserId = ? AND SnackId IS NOT NULL AND TransactionAmount < 0
       GROUP BY SnackId
       ORDER BY PurchaseCount DESC
       LIMIT 10`,
      [userId]
    );

    const mostBoughtResponse = mostBought.map(m => {
      const snack = m.SnackId ? get('SELECT Name, ImageUrl FROM Snacks WHERE SnackId = ?', [m.SnackId]) : null;
      return {
        SnackId: m.SnackId,
        Name: snack?.Name || 'Unknown',
        ImageUrl: snack?.ImageUrl || null,
        PurchaseCount: m.PurchaseCount,
        TotalSpent: m.TotalSpent,
      };
    });

    // Daily spending over last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailySpending = all(
      `SELECT date(Timestamp) as Date, SUM(-TransactionAmount) as Amount
       FROM Transactions
       WHERE UserId = ? AND TransactionAmount < 0 AND Timestamp >= ?
       GROUP BY date(Timestamp)
       ORDER BY Date`,
      [userId, thirtyDaysAgo.toISOString()]
    );

    // Total stats
    const totalSpentRow = get(
      'SELECT COALESCE(SUM(-TransactionAmount), 0) as total FROM Transactions WHERE UserId = ? AND TransactionAmount < 0',
      [userId]
    );
    const totalPurchasesRow = get(
      'SELECT COUNT(*) as total FROM Transactions WHERE UserId = ? AND SnackId IS NOT NULL AND TransactionAmount < 0',
      [userId]
    );

    res.json({
      MostBoughtItems: mostBoughtResponse,
      DailySpending: dailySpending.map(d => ({ Date: d.Date, Amount: d.Amount })),
      TotalSpent: totalSpentRow?.total || 0,
      TotalPurchases: totalPurchasesRow?.total || 0,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching user stats: ' + err.message });
  }
});

// ─── SNACK MANAGEMENT ────────────────────────────────────────────────

// POST: /api/admin/snacks
router.post('/snacks', (req: Request, res: Response) => {
  const admin = getAdminFromHeader(req);
  if (!admin) return res.status(401).json({ message: 'Unauthorized' });

  const { Name, InitialStock, TotalCost, ImageUrl, IsAvailable } = req.body;

  if (!InitialStock || InitialStock <= 0) return res.status(400).json({ message: 'Initial stock must be greater than 0.' });
  if (TotalCost < 0) return res.status(400).json({ message: 'Total cost cannot be negative.' });

  try {
    run(
      'INSERT INTO Snacks (Name, ImageUrl, IsAvailable, Stock, Price) VALUES (?, ?, ?, 0, 0)',
      [Name, ImageUrl || null, IsAvailable !== undefined ? (IsAvailable ? 1 : 0) : 1]
    );
    const snackId = lastInsertRowId()!;

    addBatch(snackId, InitialStock, TotalCost);

    const updatedSnack = get('SELECT * FROM Snacks WHERE SnackId = ?', [snackId]);
    res.status(201).json({
      SnackId: updatedSnack?.SnackId,
      Name: updatedSnack?.Name,
      Price: updatedSnack?.Price,
      IsAvailable: !!updatedSnack?.IsAvailable,
      Stock: updatedSnack?.Stock,
      ImageUrl: updatedSnack?.ImageUrl,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to create snack: ' + err.message });
  }
});

// PUT: /api/admin/snacks/:id
router.put('/snacks/:id', (req: Request, res: Response) => {
  const admin = getAdminFromHeader(req);
  if (!admin) return res.status(401).json({ message: 'Unauthorized' });

  const id = parseInt(req.params.id);
  const { SnackId, Name, Price, Stock, ImageUrl, IsAvailable } = req.body;

  if (id !== SnackId) {
    return res.status(400).json({ message: 'Snack ID in URL and body do not match.' });
  }

  const existing = get('SELECT * FROM Snacks WHERE SnackId = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Snack not found.' });

  run(
    'UPDATE Snacks SET Name = ?, Price = ?, Stock = ?, ImageUrl = ?, IsAvailable = ? WHERE SnackId = ?',
    [Name, Price, Stock, ImageUrl || null, IsAvailable ? 1 : 0, id]
  );

  res.status(204).send();
});

// DELETE: /api/admin/snacks/:id
router.delete('/snacks/:id', (req: Request, res: Response) => {
  const admin = getAdminFromHeader(req);
  if (!admin) return res.status(401).json({ message: 'Unauthorized' });

  const id = parseInt(req.params.id);
  const existing = get('SELECT * FROM Snacks WHERE SnackId = ?', [id]);
  if (!existing) return res.status(404).json({ message: 'Snack not found.' });

  run('DELETE FROM Snacks WHERE SnackId = ?', [id]);
  res.status(204).send();
});

// GET: /api/admin/snacks/:id
router.get('/snacks/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const snack = get('SELECT * FROM Snacks WHERE SnackId = ?', [id]);
  if (!snack) return res.status(404).json({ message: 'Snack not found.' });

  res.json({
    SnackId: snack.SnackId,
    Name: snack.Name,
    Price: snack.Price,
    IsAvailable: !!snack.IsAvailable,
    Stock: snack.Stock,
    ImageUrl: snack.ImageUrl,
  });
});

// ─── BALANCE & TRANSACTION VIEWS ────────────────────────────────────

// GET: /api/admin/user-balances
router.get('/user-balances', (req: Request, res: Response) => {
  const admin = getAdminFromHeader(req);
  if (!admin) return res.status(401).json({ message: 'Unauthorized' });

  const users = all('SELECT * FROM Users ORDER BY DisplayName');
  res.json(users.map(u => ({
    UserId: u.UserId,
    Email: u.Email,
    DisplayName: u.DisplayName,
    Balance: u.Balance,
    IsAdmin: !!u.IsAdmin,
    ProfilePictureUrl: u.ProfilePictureUrl,
  })));
});

// GET: /api/admin/user-transactions/:userId
router.get('/user-transactions/:userId', (req: Request, res: Response) => {
  const admin = getAdminFromHeader(req);
  if (!admin) return res.status(401).json({ message: 'Unauthorized' });

  const userId = parseInt(req.params.userId);
  const userExists = get('SELECT UserId FROM Users WHERE UserId = ?', [userId]);
  if (!userExists) return res.status(404).json({ message: 'User not found.' });

  const transactions = all(
    `SELECT t.TransactionId, t.TransactionAmount, t.Timestamp,
            s.Name as SnackName, s.Price as SnackPrice, s.ImageUrl as SnackImageUrl,
            u.Email as UserEmail, u.DisplayName as UserDisplayName
     FROM Transactions t
     LEFT JOIN Snacks s ON t.SnackId = s.SnackId
     LEFT JOIN Users u ON t.UserId = u.UserId
     WHERE t.UserId = ?
     ORDER BY t.Timestamp DESC`,
    [userId]
  );

  res.json(transactions);
});

// GET: /api/admin/all-transactions
router.get('/all-transactions', (req: Request, res: Response) => {
  const admin = getAdminFromHeader(req);
  if (!admin) return res.status(401).json({ message: 'Unauthorized' });

  const transactions = all(
    `SELECT t.TransactionId, t.UserId, t.TransactionAmount, t.Timestamp,
            s.Name as SnackName, s.Price as SnackPrice, s.ImageUrl as SnackImageUrl,
            u.Email as UserEmail, u.DisplayName as UserDisplayName
     FROM Transactions t
     LEFT JOIN Snacks s ON t.SnackId = s.SnackId
     LEFT JOIN Users u ON t.UserId = u.UserId
     ORDER BY t.Timestamp DESC`
  );

  res.json(transactions);
});

// ─── STORE TRENDS ────────────────────────────────────────────────────

// GET: /api/admin/store-trends
router.get('/store-trends', (req: Request, res: Response) => {
  const admin = getAdminFromHeader(req);
  if (!admin) return res.status(401).json({ message: 'Unauthorized' });

  try {
    // Total revenue
    const revenueRow = get(
      'SELECT COALESCE(SUM(-TransactionAmount), 0) as total FROM Transactions WHERE TransactionAmount < 0'
    );

    // Total credits distributed
    const creditsRow = get(
      'SELECT COALESCE(SUM(TransactionAmount), 0) as total FROM Transactions WHERE TransactionAmount > 0'
    );

    // Best sellers
    const bestSellers = all(
      `SELECT SnackId, COUNT(*) as UnitsSold, SUM(-TransactionAmount) as Revenue
       FROM Transactions
       WHERE SnackId IS NOT NULL AND TransactionAmount <= 0
       GROUP BY SnackId
       ORDER BY UnitsSold DESC
       LIMIT 5`
    );

    const bestSellersResponse = bestSellers.map(b => {
      const snack = b.SnackId ? get('SELECT Name FROM Snacks WHERE SnackId = ?', [b.SnackId]) : null;
      return {
        SnackId: b.SnackId,
        Name: snack?.Name || 'Unknown',
        UnitsSold: b.UnitsSold,
        Revenue: b.Revenue,
      };
    });

    // Stagnant inventory
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeSnacks = all('SELECT * FROM Snacks WHERE IsAvailable = 1 AND Stock > 0');

    const lastSoldDates = all(
      `SELECT SnackId, MAX(Timestamp) as LastSold
       FROM Transactions
       WHERE SnackId IS NOT NULL AND TransactionAmount <= 0
       GROUP BY SnackId`
    );
    const lastSoldMap = new Map<number, string>();
    for (const row of lastSoldDates) {
      lastSoldMap.set(row.SnackId as number, row.LastSold as string);
    }

    const stagnantInventory = activeSnacks
      .filter(s => {
        const lastSold = lastSoldMap.get(s.SnackId as number);
        return !lastSold || new Date(lastSold) < thirtyDaysAgo;
      })
      .map(s => ({
        SnackId: s.SnackId,
        Name: s.Name,
        CurrentStock: s.Stock,
        LastSoldDate: lastSoldMap.get(s.SnackId as number) || null,
      }))
      .sort((a, b) => (b.CurrentStock as number) - (a.CurrentStock as number))
      .slice(0, 10);

    res.json({
      TotalRevenue: revenueRow?.total || 0,
      TotalCreditsDistributed: creditsRow?.total || 0,
      BestSellers: bestSellersResponse,
      StagnantInventory: stagnantInventory,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Error generating store trends: ' + err.message });
  }
});

// ─── SHOPPING LIST PDF ──────────────────────────────────────────────

interface ShoppingListItem {
  Name: string;
  Quantity: number;
  Notes?: string;
}

// GET: /api/admin/test-pdf
router.get('/test-pdf', (_req: Request, res: Response) => {
  try {
    const testItems: ShoppingListItem[] = [
      { Name: 'Test Item 1', Quantity: 2, Notes: 'Test notes' },
      { Name: 'Test Item 2', Quantity: 1 },
    ];

    const textContent = generateShoppingListText(testItems);
    res.json({ message: 'Test successful', content: textContent });
  } catch (err: any) {
    res.status(500).json({ message: 'Test failed', error: err.message });
  }
});

function generateShoppingListText(items: ShoppingListItem[]): string {
  let text = `Shopping List - Generated: ${new Date().toISOString()}\n\n`;
  text += 'Items to Purchase:\n';

  for (const item of items) {
    text += `• ${item.Name} - Quantity: ${item.Quantity}`;
    if (item.Notes) text += ` (Notes: ${item.Notes})`;
    text += '\n';
  }

  text += `\nTotal Items: ${items.length}\n`;
  text += `Total Quantity: ${items.reduce((sum, i) => sum + i.Quantity, 0)}`;
  return text;
}

// POST: /api/admin/generate-shopping-list
router.post('/generate-shopping-list', (req: Request, res: Response) => {
  try {
    const admin = getAdminFromHeader(req);
    if (!admin) return res.status(401).json({ message: 'Unauthorized' });

    const items: ShoppingListItem[] = req.body?.Items;
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Shopping list cannot be empty.' });
    }

    console.log(`Generating shopping list with ${items.length} items`);

    // Generate PDF using PDFKit
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      const fileName = `Shopping_List_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.send(pdfBuffer);
    });

    // Title
    const now = new Date();
    doc.fontSize(20).font('Helvetica-Bold').text('Office Snack Shopping List', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(
      `Generated on: ${now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      { align: 'center' }
    );
    doc.moveDown(1);

    // Divider
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(1);

    // Table header
    doc.fontSize(14).font('Helvetica-Bold').text('Items to Purchase');
    doc.moveDown(0.5);

    // Table
    const tableLeft = 50;
    const colWidths = [250, 80, 150];

    // Header row
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Item', tableLeft, doc.y, { width: colWidths[0] });
    const headerY = doc.y - doc.currentLineHeight();
    doc.text('Quantity', tableLeft + colWidths[0], headerY, { width: colWidths[1], align: 'center' });
    doc.text('Notes', tableLeft + colWidths[0] + colWidths[1], headerY, { width: colWidths[2] });
    doc.moveDown(0.3);

    // Line under header
    doc.moveTo(tableLeft, doc.y).lineTo(tableLeft + colWidths[0] + colWidths[1] + colWidths[2], doc.y).stroke();
    doc.moveDown(0.3);

    // Data rows
    doc.font('Helvetica').fontSize(10);
    for (const item of items) {
      const rowY = doc.y;
      doc.text(item.Name, tableLeft, rowY, { width: colWidths[0] });
      doc.text(String(item.Quantity), tableLeft + colWidths[0], rowY, { width: colWidths[1], align: 'center' });
      doc.text(item.Notes || '-', tableLeft + colWidths[0] + colWidths[1], rowY, { width: colWidths[2] });
      doc.moveDown(0.3);
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(1);

    // Summary
    doc.fontSize(14).font('Helvetica-Bold').text('Summary');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Items: ${items.length}`);
    doc.text(`Total Quantity: ${items.reduce((sum, i) => sum + i.Quantity, 0)}`);
    doc.moveDown(1);

    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica-Oblique').text(
      'This shopping list was automatically generated by the Office Snack Tracker system.',
      { align: 'center' }
    );

    doc.end();
  } catch (err: any) {
    console.error('Shopping list generation error:', err);
    res.status(500).json({ message: 'Error generating shopping list', error: err.message });
  }
});

export default router;
