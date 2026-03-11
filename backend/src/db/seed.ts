// Database seeder — creates tables if they don't exist and seeds default snacks
import { get, run, exec, lastInsertRowId } from './index';

interface SeedSnack {
  name: string;
  price: number;
  stock: number;
  unitCost: number;
}

/**
 * Ensure all tables exist. Schema matches the EF Core migrations exactly.
 */
function createTables(): void {
  exec(`
    CREATE TABLE IF NOT EXISTS Users (
      UserId INTEGER PRIMARY KEY AUTOINCREMENT,
      Email TEXT NOT NULL,
      DisplayName TEXT,
      Balance REAL NOT NULL DEFAULT 0.00,
      IsAdmin INTEGER NOT NULL DEFAULT 0,
      ProfilePictureUrl TEXT
    );

    CREATE TABLE IF NOT EXISTS Snacks (
      SnackId INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL,
      Price REAL NOT NULL DEFAULT 0.00,
      IsAvailable INTEGER NOT NULL DEFAULT 1,
      Stock INTEGER NOT NULL DEFAULT 0,
      ImageUrl TEXT
    );

    CREATE TABLE IF NOT EXISTS Transactions (
      TransactionId INTEGER PRIMARY KEY AUTOINCREMENT,
      UserId INTEGER NOT NULL,
      SnackId INTEGER,
      TransactionAmount REAL NOT NULL,
      Timestamp TEXT NOT NULL,
      FOREIGN KEY (UserId) REFERENCES Users(UserId),
      FOREIGN KEY (SnackId) REFERENCES Snacks(SnackId)
    );

    CREATE TABLE IF NOT EXISTS SnackRequests (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      SnackName TEXT NOT NULL,
      RequestDate TEXT NOT NULL,
      Status TEXT NOT NULL DEFAULT 'Pending',
      RequestedByUserId INTEGER NOT NULL,
      FOREIGN KEY (RequestedByUserId) REFERENCES Users(UserId)
    );

    CREATE TABLE IF NOT EXISTS SnackBatches (
      SnackBatchId INTEGER PRIMARY KEY AUTOINCREMENT,
      SnackId INTEGER NOT NULL,
      UnitCost REAL NOT NULL,
      QuantityPurchased INTEGER NOT NULL,
      QuantityRemaining INTEGER NOT NULL,
      PurchaseDate TEXT NOT NULL,
      FOREIGN KEY (SnackId) REFERENCES Snacks(SnackId)
    );

    CREATE TABLE IF NOT EXISTS DistributionLogs (
      Id INTEGER PRIMARY KEY AUTOINCREMENT,
      WeekSheetName TEXT NOT NULL,
      DistributedAt TEXT NOT NULL,
      UsersUpdated INTEGER NOT NULL DEFAULT 0,
      TotalAmount REAL NOT NULL DEFAULT 0,
      IsAutomatic INTEGER NOT NULL DEFAULT 0
    );
  `);
}

/**
 * Seed default snacks if the Snacks table is empty.
 * Matches the C# DataSeeder exactly.
 */
function seedSnacks(): void {
  const count = get('SELECT COUNT(*) as cnt FROM Snacks');
  if (count && count.cnt > 0) {
    console.log('Snacks table already has data, skipping seed.');
    return;
  }

  console.log('Seeding default snacks...');

  const now = new Date().toISOString();

  const defaultSnacks: SeedSnack[] = [
    { name: 'Assorted Nuts', price: 0.50, stock: 10, unitCost: 0.50 },
    { name: 'Chips (Frito, Dorito, Ruffles, Cheetos)', price: 0.50, stock: 10, unitCost: 0.50 },
    { name: 'Chocolate Candy Bars (Kinder, M&M, Twix, M&M)', price: 0.50, stock: 10, unitCost: 0.50 },
    { name: 'Corn Dogs', price: 1.00, stock: 10, unitCost: 1.00 },
    { name: 'Granola Bars', price: 0.25, stock: 10, unitCost: 0.25 },
    { name: 'Gummy Bears', price: 0.25, stock: 10, unitCost: 0.25 },
    { name: 'Hot Pockets', price: 0.25, stock: 10, unitCost: 0.25 },
    { name: 'Jerkey Sticks', price: 0.75, stock: 10, unitCost: 0.75 },
    { name: 'Monster Energy Drinks', price: 1.25, stock: 10, unitCost: 1.25 },
    { name: 'Oatmeal', price: 0.25, stock: 10, unitCost: 0.25 },
    { name: 'Oreos, Chips Ahoy, Nilla Wafers', price: 0.50, stock: 10, unitCost: 0.50 },
    { name: 'Popcorn', price: 0.35, stock: 10, unitCost: 0.35 },
    { name: 'Pretzels & Goldfish', price: 0.00, stock: 10, unitCost: 0.00 },
    { name: 'Protein Bars', price: 1.50, stock: 10, unitCost: 1.50 },
    { name: 'Ramen', price: 0.25, stock: 10, unitCost: 0.25 },
    { name: 'Rice Krispy', price: 0.50, stock: 10, unitCost: 0.50 },
    { name: 'String Cheese', price: 0.25, stock: 10, unitCost: 0.25 },
    { name: 'Velveeta Mac n Cheese', price: 0.00, stock: 10, unitCost: 0.00 },
  ];

  for (const snack of defaultSnacks) {
    run(
      'INSERT INTO Snacks (Name, Price, Stock, IsAvailable) VALUES (?, ?, ?, 1)',
      [snack.name, snack.price, snack.stock]
    );
    const snackId = lastInsertRowId();

    run(
      'INSERT INTO SnackBatches (SnackId, QuantityPurchased, QuantityRemaining, UnitCost, PurchaseDate) VALUES (?, ?, ?, ?, ?)',
      [snackId, snack.stock, snack.stock, snack.unitCost, now]
    );
  }

  console.log(`Seeded ${defaultSnacks.length} snacks.`);
}

/**
 * Run all seed operations.
 */
export function seedDatabase(): void {
  createTables();
  seedSnacks();
  console.log('Database seeding complete.');
}
