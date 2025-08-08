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

        // POST: api/snacks/purchase
        [HttpPost("purchase")]
        public async Task<IActionResult> PurchaseSnack([FromBody] PurchaseRequest request)
        {
            var user = await _context.Users.FindAsync(request.UserId);
            var snack = await _context.Snacks.FindAsync(request.SnackId);

            if (user == null || snack == null)
            {
                return NotFound("User or Snack not found.");
            }

            // --- NEW STOCK VALIDATION ---
            if (snack.Stock <= 0)
            {
                return BadRequest(new { message = "Sorry, this snack is out of stock." });
            }

            if (!snack.IsAvailable)
            {
                return BadRequest(new { message = "Sorry, this snack is no longer available." });
            }

            // --- UPDATE LOGIC ---
            user.Balance -= snack.Price;
            snack.Stock -= 1; // Decrement the stock by 1

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
    }
}
