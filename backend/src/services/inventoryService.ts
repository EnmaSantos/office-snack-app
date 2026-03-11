// Inventory Service — batch-based inventory with FIFO consumption and weighted-average pricing
import { all, run } from '../db';

/**
 * Recalculate and update the price and stock for a snack based on active batches.
 * Price = weighted average of batch unit costs, rounded UP to nearest $0.05.
 */
export function updateSnackPriceAndStock(snackId: number): void {
  const activeBatches = all(
    'SELECT * FROM SnackBatches WHERE SnackId = ? AND QuantityRemaining > 0',
    [snackId]
  );

  const totalStock = activeBatches.reduce((sum, b) => sum + (b.QuantityRemaining as number), 0);

  if (activeBatches.length > 0 && totalStock > 0) {
    const totalValue = activeBatches.reduce(
      (sum, b) => sum + (b.QuantityRemaining as number) * (b.UnitCost as number),
      0
    );
    const rawPrice = totalValue / totalStock;

    // Round UP to nearest $0.05, then fix floating point
    const roundedPrice = Math.ceil(rawPrice / 0.05) * 0.05;
    const finalPrice = Math.round(roundedPrice * 100) / 100;

    run('UPDATE Snacks SET Stock = ?, Price = ? WHERE SnackId = ?', [totalStock, finalPrice, snackId]);
  } else {
    // No active batches — set stock to 0 but retain last known price
    run('UPDATE Snacks SET Stock = ? WHERE SnackId = ?', [totalStock, snackId]);
  }
}

/**
 * Add a new inventory batch and update the snack's price/stock.
 */
export function addBatch(snackId: number, quantity: number, totalCost: number): void {
  if (quantity <= 0) throw new Error('Quantity must be positive');
  if (totalCost < 0) throw new Error('Total cost cannot be negative');

  const unitCost = totalCost / quantity;
  const now = new Date().toISOString();

  run(
    'INSERT INTO SnackBatches (SnackId, QuantityPurchased, QuantityRemaining, UnitCost, PurchaseDate) VALUES (?, ?, ?, ?, ?)',
    [snackId, quantity, quantity, unitCost, now]
  );

  updateSnackPriceAndStock(snackId);
}

/**
 * Consume stock using FIFO (First-In, First-Out).
 * Deducts from the oldest batches first, then recalculates price.
 */
export function consumeStock(snackId: number, quantityToConsume: number): void {
  const batches = all(
    'SELECT * FROM SnackBatches WHERE SnackId = ? AND QuantityRemaining > 0 ORDER BY PurchaseDate ASC',
    [snackId]
  );

  const totalStock = batches.reduce((sum, b) => sum + (b.QuantityRemaining as number), 0);
  if (totalStock < quantityToConsume) {
    throw new Error(`Insufficient stock. Requested: ${quantityToConsume}, Available: ${totalStock}`);
  }

  let remainingToConsume = quantityToConsume;

  for (const batch of batches) {
    if (remainingToConsume <= 0) break;

    const qty = batch.QuantityRemaining as number;
    if (qty >= remainingToConsume) {
      run(
        'UPDATE SnackBatches SET QuantityRemaining = QuantityRemaining - ? WHERE SnackBatchId = ?',
        [remainingToConsume, batch.SnackBatchId]
      );
      remainingToConsume = 0;
    } else {
      remainingToConsume -= qty;
      run(
        'UPDATE SnackBatches SET QuantityRemaining = 0 WHERE SnackBatchId = ?',
        [batch.SnackBatchId]
      );
    }
  }

  updateSnackPriceAndStock(snackId);
}
