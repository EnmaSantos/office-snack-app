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

        // --- NEW METHOD ---
        // POST: api/snacks/purchase
        [HttpPost("purchase")]
        public async Task<IActionResult> PurchaseSnack([FromBody] PurchaseRequest request)
        {
            // Step 1: Find the user and the snack in the database.
            var user = await _context.Users.FindAsync(request.UserId);
            var snack = await _context.Snacks.FindAsync(request.SnackId);

            // Step 2: Validate the data. If user or snack doesn't exist, return an error.
            if (user == null || snack == null)
            {
                return NotFound("User or Snack not found.");
            }

            if (!snack.IsAvailable)
            {
                return BadRequest("Sorry, this snack is no longer available.");
            }

            // Step 3: Perform the logic.
            user.Balance -= snack.Price;

            var transaction = new Transaction
            {
                UserId = user.UserId,
                SnackId = snack.SnackId,
                TransactionAmount = snack.Price,
                Timestamp = DateTime.UtcNow
            };

            // Step 4: Add the new transaction to the context.
            _context.Transactions.Add(transaction);

            // Step 5: Save all changes to the database.
            await _context.SaveChangesAsync();

            // Step 6: Return a success response.
            return Ok(new { message = "Purchase successful!", newBalance = user.Balance });
        }
    }
}
