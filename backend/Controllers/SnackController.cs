// File: backend/Controllers/SnacksController.cs

using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SnackTracker.Api.Data;
using SnackTracker.Api.Models;

namespace SnackTracker.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SnacksController : ControllerBase
    {
        private readonly SnackTrackerContext _context;

        public SnacksController(SnackTrackerContext context)
        {
            _context = context;
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
        // We can keep it for single-item purchases if we want, or remove it.
        [HttpPost("purchase")]
        public async Task<IActionResult> PurchaseSnack([FromBody] PurchaseRequest request)
        {
            var user = await _context.Users.FindAsync(request.UserId);
            var snack = await _context.Snacks.FindAsync(request.SnackId);

            if (user == null || snack == null)
            {
                return NotFound("User or Snack not found.");
            }

            if (snack.Stock <= 0)
            {
                return BadRequest(new { message = "Sorry, this snack is out of stock." });
            }

            user.Balance -= snack.Price;
            snack.Stock -= 1;

            var transaction = new Transaction
            {
                UserId = user.UserId,
                SnackId = snack.SnackId,
                TransactionAmount = snack.Price,
                Timestamp = DateTime.UtcNow
            };

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Purchase successful!", newBalance = user.Balance });
        }

        // --- NEW CHECKOUT ENDPOINT ---
        [HttpPost("checkout")]
        public async Task<IActionResult> Checkout([FromBody] CheckoutRequest request)
        {
            // Use a database transaction. This is a safety net that ensures
            // ALL operations succeed, or NONE of them do.
            using var dbTransaction = await _context.Database.BeginTransactionAsync();

            try
            {
                var user = await _context.Users.FindAsync(request.UserId);
                if (user == null) return NotFound("User not found.");

                var snacksInCart = await _context.Snacks
                    .Where(s => request.SnackIds.Contains(s.SnackId))
                    .ToListAsync();

                decimal totalCost = 0;
                // First, validate the entire cart before making changes.
                foreach (var snackId in request.SnackIds)
                {
                    var snack = snacksInCart.FirstOrDefault(s => s.SnackId == snackId);
                    if (snack == null)
                    {
                        return BadRequest($"Snack with ID {snackId} not found.");
                    }
                    if (snack.Stock <= 0)
                    {
                        return BadRequest($"Sorry, '{snack.Name}' is out of stock.");
                    }
                    totalCost += snack.Price;
                }

                if (user.Balance < totalCost)
                {
                    return BadRequest("Insufficient funds for this purchase.");
                }

                // All checks passed. Now, execute the changes.
                user.Balance -= totalCost;

                foreach (var snackId in request.SnackIds)
                {
                    var snack = snacksInCart.First(s => s.SnackId == snackId);
                    snack.Stock -= 1; // Decrement stock

                    var purchaseTransaction = new Transaction
                    {
                        UserId = user.UserId,
                        SnackId = snack.SnackId,
                        TransactionAmount = snack.Price,
                        Timestamp = DateTime.UtcNow
                    };
                    _context.Transactions.Add(purchaseTransaction);
                }

                await _context.SaveChangesAsync();
                await dbTransaction.CommitAsync(); // Finalize all changes

                return Ok(new { message = "Checkout successful!", newBalance = user.Balance });
            }
            catch (Exception)
            {
                await dbTransaction.RollbackAsync(); // Undo all changes if anything fails
                return StatusCode(500, "An unexpected error occurred. The transaction has been rolled back.");
            }
        }
    }
}
