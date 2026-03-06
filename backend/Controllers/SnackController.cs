// File: backend/Controllers/SnacksController.cs

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SnackTracker.Api.Data;
using SnackTracker.Api.Models;
using SnackTracker.Api.Services;

namespace SnackTracker.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SnacksController : ControllerBase
    {
        private readonly SnackTrackerContext _context;
        private readonly InventoryService _inventoryService;

        public SnacksController(SnackTrackerContext context, InventoryService inventoryService)
        {
            _context = context;
            _inventoryService = inventoryService;
        }

        // GET: api/snacks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Snack>>> GetSnacks()
        {
            var availableSnacks = await _context.Snacks
                .Where(s => s.IsAvailable)
                .ToListAsync();

            return Ok(availableSnacks);
        }

        // This endpoint is now replaced by the /checkout endpoint for cart functionality.
        [HttpPost("purchase")]
        public async Task<IActionResult> PurchaseSnack([FromBody] PurchaseRequest request)
        {
            // Start a transaction to ensure consistency between stock consumption and balance update
            using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
        {
            var user = await _context.Users.FindAsync(request.UserId);
            var snack = await _context.Snacks.FindAsync(request.SnackId);

            if (user == null || snack == null)
            {
                return NotFound(new { message = "User or Snack not found." });
            }

            if (snack.Stock <= 0)
            {
                return BadRequest(new { message = "Sorry, this snack is out of stock." });
            }

                // 1. Deduct Balance
            user.Balance -= snack.Price;

                // 2. Consume Stock (Updates Inventory and Price)
                await _inventoryService.ConsumeStockAsync(snack.SnackId, 1);

                // 3. Record Transaction
            var transaction = new Transaction
            {
                UserId = user.UserId,
                SnackId = snack.SnackId,
                TransactionAmount = -snack.Price, // Negative for purchases
                Timestamp = DateTime.UtcNow
            };

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync();

            return Ok(new { message = "Purchase successful!", newBalance = user.Balance });
        }
            catch (Exception ex)
            {
                await dbTransaction.RollbackAsync();
                return BadRequest(new { message = ex.Message });
            }
        }

        // --- CHECKOUT ENDPOINT ---
        [HttpPost("checkout")]
        public async Task<IActionResult> Checkout([FromBody] CheckoutRequest request)
        {
            // Use a database transaction. This is a safety net that ensures
            // ALL operations succeed, or NONE of them do.
            using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var user = await _context.Users.FindAsync(request.UserId);
                if (user == null) return NotFound(new { message = "User not found." });

                var snacksInCart = await _context.Snacks
                    .Where(s => request.SnackIds.Contains(s.SnackId))
                    .ToListAsync();

                decimal totalCost = 0;
                bool waterDiscountApplied = false;

                // Check if the user already purchased water today
                // Assuming any snack named exactly "Water" (case-insensitive) applies
                var hasPurchasedWaterToday = await _context.Transactions
                    .Include(t => t.Snack)
                    .AnyAsync(t => 
                        t.UserId == user.UserId && 
                        t.Snack != null && 
                        t.Snack.Name.ToLower() == "water" && 
                        t.Timestamp.Date == DateTime.UtcNow.Date);

                // First, validate the entire cart before making changes.
                foreach (var snackId in request.SnackIds)
                {
                    var snack = snacksInCart.FirstOrDefault(s => s.SnackId == snackId);
                    if (snack == null)
                    {
                        return BadRequest(new { message = $"Snack with ID {snackId} not found." });
                    }
                    if (snack.Stock <= 0)
                    {
                        return BadRequest(new { message = $"Sorry, '{snack.Name}' is out of stock." });
                    }

                    // Apply the "First Water is Free" rule
                    if (snack.Name.Equals("Water", StringComparison.OrdinalIgnoreCase) && 
                        !hasPurchasedWaterToday && 
                        !waterDiscountApplied)
                    {
                        // Free water! Don't add to totalCost
                        waterDiscountApplied = true;
                    }
                    else
                    {
                        totalCost += snack.Price;
                    }
                }

                // Check for Negative Balance Rule
                if (user.Balance < totalCost)
                {
                    return BadRequest(new { message = $"Insufficient funds. Your balance is {user.Balance:C}, but the cart total is {totalCost:C}." });
                }

                // All checks passed. Now, execute the changes.
                user.Balance -= totalCost;

                // Need to track if we've given the free water so we only give ONE per checkout if they add multiple
                bool waterDiscountGivenInLoop = false;

                // Process each item
                foreach (var snackId in request.SnackIds)
                {
                    var snack = snacksInCart.First(s => s.SnackId == snackId);
                    
                    decimal transactionPrice = snack.Price;

                    if (snack.Name.Equals("Water", StringComparison.OrdinalIgnoreCase) && 
                        !hasPurchasedWaterToday && 
                        !waterDiscountGivenInLoop)
                    {
                        transactionPrice = 0.00m;
                        waterDiscountGivenInLoop = true;
                    }

                    // Record transaction using the effective price paid (0 if free water, else current price)
                    var purchaseTransaction = new Transaction
                    {
                        UserId = user.UserId,
                        SnackId = snack.SnackId,
                        TransactionAmount = -transactionPrice, 
                        Timestamp = DateTime.UtcNow
                    };
                    _context.Transactions.Add(purchaseTransaction);

                    // Consume stock (this updates the Batch and recalculates Price for NEXT time)
                    // We await this sequentially to ensure strict ordering of batch consumption
                    await _inventoryService.ConsumeStockAsync(snackId, 1);
                }

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync(); // Finalize all changes

                return Ok(new { message = "Checkout successful!", newBalance = user.Balance });
            }
            catch (Exception ex)
            {
                await dbTransaction.RollbackAsync(); // Undo all changes if anything fails
                return StatusCode(500, new { message = "An error occurred during checkout: " + ex.Message });
            }
        }

        // --- NEW RESTOCK ENDPOINT ---
        [HttpPost("{id}/restock")]
        public async Task<IActionResult> RestockSnack(int id, [FromBody] RestockRequest request)
        {
            try
            {
                await _inventoryService.AddBatchAsync(id, request.Quantity, request.TotalCost);
                return Ok(new { message = "Restock successful. Price updated." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
