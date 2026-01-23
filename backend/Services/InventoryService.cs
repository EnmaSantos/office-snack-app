using Microsoft.EntityFrameworkCore;
using SnackTracker.Api.Data;
using SnackTracker.Api.Models;

namespace SnackTracker.Api.Services
{
    public class InventoryService
    {
        private readonly SnackTrackerContext _context;

        public InventoryService(SnackTrackerContext context)
        {
            _context = context;
        }

        // Recalculates and updates the price and stock for a snack based on active batches
        public async Task UpdateSnackPriceAndStockAsync(int snackId)
        {
            var snack = await _context.Snacks
                .Include(s => s.Batches)
                .FirstOrDefaultAsync(s => s.SnackId == snackId);

            if (snack == null) return;

            var activeBatches = snack.Batches.Where(b => b.QuantityRemaining > 0).ToList();

            // 1. Update Stock Count
            snack.Stock = activeBatches.Sum(b => b.QuantityRemaining);

            // 2. Calculate Weighted Average Price
            if (activeBatches.Any())
            {
                decimal totalValue = activeBatches.Sum(b => b.QuantityRemaining * b.UnitCost);
                int totalItems = activeBatches.Sum(b => b.QuantityRemaining);

                if (totalItems > 0)
                {
                    decimal rawPrice = totalValue / totalItems;
                    
                    // 3. Apply Rounding Rule (Round UP to nearest 0.05)
                    // Logic: Ceiling(Price / 0.05) * 0.05
                    decimal roundedPrice = Math.Ceiling(rawPrice / 0.05m) * 0.05m;
                    
                    snack.Price = roundedPrice;
                }
            }
            // If no active batches, we retain the last known price.
            
            await _context.SaveChangesAsync();
        }

        // Adds a new inventory batch and updates the price
        public async Task AddBatchAsync(int snackId, int quantity, decimal totalCost)
        {
            if (quantity <= 0) throw new ArgumentException("Quantity must be positive");
            if (totalCost < 0) throw new ArgumentException("Total cost cannot be negative");

            var unitCost = totalCost / quantity;

            var batch = new SnackBatch
            {
                SnackId = snackId,
                QuantityPurchased = quantity,
                QuantityRemaining = quantity,
                UnitCost = unitCost,
                PurchaseDate = DateTime.UtcNow
            };

            _context.SnackBatches.Add(batch);
            await _context.SaveChangesAsync();

            // Trigger recalculation
            await UpdateSnackPriceAndStockAsync(snackId);
        }

        // Consumes stock using FIFO (First-In, First-Out)
        public async Task ConsumeStockAsync(int snackId, int quantityToConsume)
        {
            var snack = await _context.Snacks
                .Include(s => s.Batches)
                .FirstOrDefaultAsync(s => s.SnackId == snackId);
                
            if (snack == null) throw new Exception("Snack not found");
            
            // Verify total stock first
            int totalStock = snack.Batches.Where(b => b.QuantityRemaining > 0).Sum(b => b.QuantityRemaining);
            if (totalStock < quantityToConsume) 
            {
                throw new InvalidOperationException($"Insufficient stock. Requested: {quantityToConsume}, Available: {totalStock}");
            }

            // Get active batches ordered by date (FIFO)
            var batches = snack.Batches
                .Where(b => b.QuantityRemaining > 0)
                .OrderBy(b => b.PurchaseDate)
                .ToList();

            int remainingToConsume = quantityToConsume;

            foreach (var batch in batches)
            {
                if (remainingToConsume <= 0) break;

                if (batch.QuantityRemaining >= remainingToConsume)
                {
                    // This batch has enough to cover the rest
                    batch.QuantityRemaining -= remainingToConsume;
                    remainingToConsume = 0;
                }
                else
                {
                    // Take what we can from this batch
                    remainingToConsume -= batch.QuantityRemaining;
                    batch.QuantityRemaining = 0;
                }
            }

            await _context.SaveChangesAsync();
            
            // Recalculate price (because the ratio of cheap/expensive batches might have changed)
            await UpdateSnackPriceAndStockAsync(snackId);
        }
    }
}

