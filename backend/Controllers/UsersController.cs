using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SnackTracker.Api.Data;
using SnackTracker.Api.Models;

namespace SnackTracker.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly SnackTrackerContext _context;

        public UsersController(SnackTrackerContext context)
        {
            _context = context;
        }

        // POST: api/users/add-balance
        [HttpPost("add-balance")]
        public async Task<IActionResult> AddBalance([FromBody] AddBalanceRequest request)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out var userId))
            {
                return Unauthorized(new { message = "Invalid user token." });
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            user.Balance += request.Amount;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Balance updated successfully.", newBalance = user.Balance });
        }

        // GET: api/users/transactions
        [HttpGet("transactions")]
        public async Task<IActionResult> GetUserTransactions()
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdString, out var userId))
            {
                return Unauthorized(new { message = "Invalid user token." });
            }

            var transactions = await _context.Transactions
                .Include(t => t.Snack)
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.Timestamp)
                .Select(t => new
                {
                    t.TransactionId,
                    t.TransactionAmount,
                    t.Timestamp,
                    SnackName = t.Snack.Name,
                    SnackPrice = t.Snack.Price,
                    SnackImageUrl = t.Snack.ImageUrl
                })
                .ToListAsync();

            return Ok(transactions);
        }
    }
}


