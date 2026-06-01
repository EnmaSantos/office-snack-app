"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSnackPriceAndStock = updateSnackPriceAndStock;
exports.addBatch = addBatch;
exports.consumeStock = consumeStock;
// Inventory Service - batch-based inventory with FIFO consumption and weighted-average pricing
const db_1 = require("../db");
/**
 * Recalculate and update the price and stock for a snack based on active batches.
 * Price = weighted average of batch unit costs, rounded UP to nearest $0.05.
 */
function updateSnackPriceAndStock(snackId) {
    const activeBatches = (0, db_1.all)('SELECT * FROM SnackBatches WHERE SnackId = ? AND QuantityRemaining > 0', [snackId]);
    const totalStock = activeBatches.reduce((sum, b) => sum + b.QuantityRemaining, 0);
    if (activeBatches.length > 0 && totalStock > 0) {
        const totalValue = activeBatches.reduce((sum, b) => sum + b.QuantityRemaining * b.UnitCost, 0);
        const rawPrice = totalValue / totalStock;
        // Round UP to nearest $0.05, then fix floating point
        const roundedPrice = Math.ceil(rawPrice / 0.05) * 0.05;
        const finalPrice = Math.round(roundedPrice * 100) / 100;
        (0, db_1.run)('UPDATE Snacks SET Stock = ?, Price = ? WHERE SnackId = ?', [totalStock, finalPrice, snackId]);
    }
    else {
        // No active batches - set stock to 0 but retain last known price
        (0, db_1.run)('UPDATE Snacks SET Stock = ? WHERE SnackId = ?', [totalStock, snackId]);
    }
}
/**
 * Add a new inventory batch and update the snack's price/stock.
 */
function addBatch(snackId, quantity, totalCost) {
    if (quantity <= 0)
        throw new Error('Quantity must be positive');
    if (totalCost < 0)
        throw new Error('Total cost cannot be negative');
    const unitCost = totalCost / quantity;
    const now = new Date().toISOString();
    (0, db_1.run)('INSERT INTO SnackBatches (SnackId, QuantityPurchased, QuantityRemaining, UnitCost, PurchaseDate) VALUES (?, ?, ?, ?, ?)', [snackId, quantity, quantity, unitCost, now]);
    updateSnackPriceAndStock(snackId);
}
/**
 * Consume stock using FIFO (First-In, First-Out).
 * Deducts from the oldest batches first, then recalculates price.
 */
function consumeStock(snackId, quantityToConsume) {
    const batches = (0, db_1.all)('SELECT * FROM SnackBatches WHERE SnackId = ? AND QuantityRemaining > 0 ORDER BY PurchaseDate ASC', [snackId]);
    const totalStock = batches.reduce((sum, b) => sum + b.QuantityRemaining, 0);
    if (totalStock < quantityToConsume) {
        throw new Error(`Insufficient stock. Requested: ${quantityToConsume}, Available: ${totalStock}`);
    }
    let remainingToConsume = quantityToConsume;
    for (const batch of batches) {
        if (remainingToConsume <= 0)
            break;
        const qty = batch.QuantityRemaining;
        if (qty >= remainingToConsume) {
            (0, db_1.run)('UPDATE SnackBatches SET QuantityRemaining = QuantityRemaining - ? WHERE SnackBatchId = ?', [remainingToConsume, batch.SnackBatchId]);
            remainingToConsume = 0;
        }
        else {
            remainingToConsume -= qty;
            (0, db_1.run)('UPDATE SnackBatches SET QuantityRemaining = 0 WHERE SnackBatchId = ?', [batch.SnackBatchId]);
        }
    }
    updateSnackPriceAndStock(snackId);
}
